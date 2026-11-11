// Self-test for the RL engine. Run with:  npx tsx scripts/rl-selftest.ts
import { MLP, createRng, randn } from "../lib/rl/nn";
import { PPOAgent, DEFAULT_PPO_CONFIG, computeGAE } from "../lib/rl/ppo";
import { trainAgent, splitSeries, DEFAULT_TRAIN_OPTIONS } from "../lib/rl/trainer";
import { WARMUP } from "../lib/rl/features";
import { newLiveState, runLiveCycle, DEFAULT_LIVE_OPTIONS } from "../lib/rl/live";
import { TradingEnv, DEFAULT_ENV_CONFIG } from "../lib/rl/environment";

let failed = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${extra}`);
  if (!cond) failed++;
};

async function main() {
  // 1. Gradient check on MLP
  {
    const rng = createRng(1);
    const net = new MLP([5, 8, 3], 1, rng);
    const x = [0.3, -0.7, 1.1, 0.2, -0.4];
    const target = [0.5, -0.2, 0.1];
    const loss = () => {
      const o = net.predict(x);
      return o.reduce((s, v, i) => s + 0.5 * (v - target[i]) ** 2, 0);
    };
    net.zeroGrad();
    const acts = net.forward(x);
    const out = acts[acts.length - 1];
    net.backward(acts, Array.from(out).map((v, i) => v - target[i]));
    let maxRel = 0;
    for (const L of net.layers) {
      for (let i = 0; i < Math.min(10, L.W.length); i++) {
        const orig = L.W[i];
        const eps = 1e-6;
        L.W[i] = orig + eps;
        const lp = loss();
        L.W[i] = orig - eps;
        const lm = loss();
        L.W[i] = orig;
        const num = (lp - lm) / (2 * eps);
        const rel = Math.abs(num - L.gW[i]) / (Math.abs(num) + Math.abs(L.gW[i]) + 1e-9);
        maxRel = Math.max(maxRel, rel);
      }
    }
    ok("MLP backprop matches numerical gradient", maxRel < 1e-5, `(max rel err ${maxRel.toExponential(2)})`);
  }

  // 2. GAE sanity: single terminal step => advantage = r - V
  {
    const { advantages, returns } = computeGAE(
      [{ obs: [], action: 0, logp: 0, value: 0.5, reward: 2, done: true, bootstrap: 0 }],
      0.99, 0.95, 0
    );
    ok("GAE terminal step", Math.abs(advantages[0] - 1.5) < 1e-9 && Math.abs(returns[0] - 2) < 1e-9);
  }

  // 3. Environment accounting: buy then sell on flat price loses only fees/slippage
  {
    const prices = Array.from({ length: 200 }, () => 100);
    const env = new TradingEnv({ prices }, DEFAULT_ENV_CONFIG);
    env.reset({ start: 60, end: 100 });
    env.step(1);
    const r = env.step(2);
    const loss = 1 - r.equity / DEFAULT_ENV_CONFIG.account.initialCash;
    ok("Round-trip on flat price costs fees only", loss > 0 && loss < 0.01, `(loss ${(loss * 100).toFixed(3)}%)`);
    const inv = env.step(2);
    ok("Invalid sell is penalised", inv.breakdown.invalid < 0);
  }

  // 4. Learning test. Persistent bull/bear regimes are learnable from the agent's features, so a working PPO
  //    implementation must (a) improve its training reward and (b) beat buy & hold on HELD-OUT data.
  {
    const trendSeries = (n: number, seed: number) => {
      const rng = createRng(seed);
      const p = [100];
      let dir = 1,
        left = 60;
      for (let i = 1; i < n; i++) {
        if (--left <= 0) {
          dir = -dir;
          left = 50 + Math.floor(rng() * 80);
        }
        p.push(p[i - 1] * Math.exp(dir * 0.004 + 0.008 * randn(rng)));
      }
      return p;
    };
    const series = { prices: trendSeries(1200, 11) };
    const agent = new PPOAgent({ ...DEFAULT_PPO_CONFIG, seed: 5 });
    const t0 = Date.now();
    const res = await trainAgent(agent, series, { ...DEFAULT_TRAIN_OPTIONS, iterations: 45, syntheticSeries: 0 });
    const secs = (Date.now() - t0) / 1000;
    const first = res.history.slice(0, 3).reduce((s, h) => s + h.meanEpisodeReward, 0) / 3;
    const last = res.history.slice(-5).reduce((s, h) => s + h.meanEpisodeReward, 0) / 5;
    console.log(`   trained 45 iterations in ${secs.toFixed(1)}s; mean episode reward ${first.toFixed(1)} -> ${last.toFixed(1)}`);
    ok("Mean training reward improves", last > first);
    ok("Policy entropy is finite", Number.isFinite(res.history[res.history.length - 1].stats.entropy));

    if (res.best) agent.loadSnapshot(res.best.snapshot);
    const { val } = splitSeries(series, DEFAULT_TRAIN_OPTIONS.validationFraction);
    const ev = agent.evaluatePolicy(val, DEFAULT_ENV_CONFIG, WARMUP);
    console.log(`   held-out: agent ${(ev.totalReturn * 100).toFixed(1)}% vs buy&hold ${(ev.buyHoldReturn * 100).toFixed(1)}% (${ev.nTrades} trades, Sharpe ${ev.sharpe.toFixed(2)})`);
    ok("Agent beats buy & hold on held-out data", ev.totalReturn > ev.buyHoldReturn && ev.totalReturn > 0.05);

    // Snapshot round trip
    const snap = JSON.parse(JSON.stringify(agent.snapshot()));
    const clone = PPOAgent.fromSnapshot(snap);
    const probe = Array(14).fill(0.1);
    const a = agent.evaluate(probe),
      b = clone.evaluate(probe);
    ok("Snapshot save/load round-trips exactly", a.probs.every((p, i) => Math.abs(p - b.probs[i]) < 1e-12) && Math.abs(a.value - b.value) < 1e-12);

    // 5. Live self-learning loop: settles rewards, triggers online PPO updates
    const assets = [{ id: "A", name: "Asset A", type: "crypto" as const }];
    const state = newLiveState(agent);
    const hist = trendSeries(300, 99);
    const opts = { ...DEFAULT_LIVE_OPTIONS(DEFAULT_ENV_CONFIG.account, DEFAULT_ENV_CONFIG.reward), minBatch: 10 };
    const before = JSON.stringify(agent.actor.toJSON().W[0].slice(0, 20));
    for (let i = 0; i < 30; i++) {
      hist.push(hist[hist.length - 1] * Math.exp(0.003 + 0.01 * randn(createRng(i + 1))));
      runLiveCycle(agent, state, assets, { A: hist }, opts);
    }
    const after = JSON.stringify(agent.actor.toJSON().W[0].slice(0, 20));
    ok("Live loop settles decisions into rewards", state.settledDecisions >= 28, `(${state.settledDecisions} settled)`);
    ok("Live loop triggers online PPO updates", state.onlineUpdates >= 2, `(${state.onlineUpdates} updates)`);
    ok("Online learning actually changes the weights", before !== after);
  }

  console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed");
  process.exit(failed ? 1 : 0);
}
main();
