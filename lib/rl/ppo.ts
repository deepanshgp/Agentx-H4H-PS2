// Proximal Policy Optimization (PPO-Clip) with GAE, for a discrete action space.
// Actor and critic are separate tanh MLPs. Pure TypeScript, no dependencies.

import { MLP, MLPState, RNG, createRng } from "./nn";
import { N_ACTIONS } from "./account";
import { N_FEATURES } from "./features";
import { TradingEnv, PriceSeries, EnvConfig, DEFAULT_ENV_CONFIG, ClosedTrade } from "./environment";

// ─── Config ──────────────────────────────────────────────────────────────────

export interface PPOConfig {
  hidden: number;
  gamma: number;
  lambda: number;
  clipEps: number;
  lrActor: number;
  lrCritic: number;
  epochs: number;
  minibatch: number;
  /** Environment steps collected per PPO update. */
  stepsPerUpdate: number;
  entropyCoef: number;
  valueCoef: number;
  maxGradNorm: number;
  /** Stop the epoch loop early if approx KL exceeds this. */
  targetKL: number;
  seed: number;
}

export const DEFAULT_PPO_CONFIG: PPOConfig = {
  hidden: 64,
  gamma: 0.99,
  lambda: 0.95,
  clipEps: 0.2,
  lrActor: 3e-4,
  lrCritic: 1e-3,
  epochs: 4,
  minibatch: 64,
  stepsPerUpdate: 1024,
  entropyCoef: 0.01,
  valueCoef: 0.5,
  maxGradNorm: 0.5,
  targetKL: 0.03,
  seed: 42,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Transition {
  obs: number[];
  action: number;
  logp: number;
  value: number;
  reward: number;
  /** True if the trajectory ends after this transition (terminal or truncated). */
  done: boolean;
  /** If done by truncation: value estimate of the next state (bootstrap). 0 for true terminal. */
  bootstrap: number;
}

export interface UpdateStats {
  policyLoss: number;
  valueLoss: number;
  entropy: number;
  approxKL: number;
  clipFrac: number;
  explainedVar: number;
}

export interface PolicyOutput {
  probs: number[];
  logits: number[];
  value: number;
}

export interface AgentSnapshot {
  version: 1;
  config: PPOConfig;
  actor: MLPState;
  critic: MLPState;
  updates: number;
  totalSteps: number;
}

export interface EvalResult {
  equityCurve: number[];
  buyHoldCurve: number[];
  actions: number[];
  trades: { bar: number; side: "BUY" | "SELL"; price: number; value: number }[];
  closedTrades: ClosedTrade[];
  totalReturn: number; // fraction
  buyHoldReturn: number; // fraction
  sharpe: number; // annualised (252)
  maxDrawdown: number; // fraction
  winRate: number; // 0..1 (closed trades)
  nTrades: number;
  startBar: number;
  endBar: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function softmax(z: ArrayLike<number>): number[] {
  let m = -Infinity;
  for (let i = 0; i < z.length; i++) m = Math.max(m, z[i]);
  const e = new Array<number>(z.length);
  let s = 0;
  for (let i = 0; i < z.length; i++) {
    e[i] = Math.exp(z[i] - m);
    s += e[i];
  }
  for (let i = 0; i < e.length; i++) e[i] /= s;
  return e;
}

function sampleCategorical(p: number[], rng: RNG): number {
  const u = rng();
  let c = 0;
  for (let i = 0; i < p.length; i++) {
    c += p[i];
    if (u <= c) return i;
  }
  return p.length - 1;
}

/** Generalised Advantage Estimation over a flat list of transitions with `done` boundaries. */
export function computeGAE(
  batch: Transition[],
  gamma: number,
  lambda: number,
  lastValue: number
): { advantages: number[]; returns: number[] } {
  const n = batch.length;
  const adv = new Array<number>(n).fill(0);
  let gae = 0;
  for (let t = n - 1; t >= 0; t--) {
    const tr = batch[t];
    let nextValue: number;
    let nonTerminal: number;
    if (tr.done) {
      nextValue = tr.bootstrap;
      nonTerminal = 0; // do not carry GAE across episode boundaries
    } else {
      nextValue = t === n - 1 ? lastValue : batch[t + 1].value;
      nonTerminal = 1;
    }
    const delta = tr.reward + gamma * nextValue - tr.value;
    gae = delta + gamma * lambda * nonTerminal * gae;
    adv[t] = gae;
  }
  const returns = adv.map((a, i) => a + batch[i].value);
  return { advantages: adv, returns };
}

// ─── Agent ───────────────────────────────────────────────────────────────────

export class PPOAgent {
  actor: MLP;
  critic: MLP;
  rng: RNG;
  updates = 0;
  totalSteps = 0;

  constructor(public cfg: PPOConfig = DEFAULT_PPO_CONFIG, public nObs = N_FEATURES) {
    const r = createRng(cfg.seed);
    this.rng = createRng(cfg.seed + 1);
    this.actor = new MLP([nObs, cfg.hidden, cfg.hidden, N_ACTIONS], 0.01, r);
    this.critic = new MLP([nObs, cfg.hidden, cfg.hidden, 1], 1.0, r);
  }

  /** Policy + value for one observation. */
  evaluate(obs: ArrayLike<number>): PolicyOutput {
    const logits = this.actor.predict(obs);
    const value = this.critic.predict(obs)[0];
    return { probs: softmax(logits), logits: Array.from(logits), value };
  }

  /** Choose an action. Greedy picks argmax; otherwise samples from the policy. */
  act(obs: ArrayLike<number>, greedy = false): { action: number; logp: number; value: number; probs: number[] } {
    const { probs, value } = this.evaluate(obs);
    let action = 0;
    if (greedy) {
      for (let i = 1; i < probs.length; i++) if (probs[i] > probs[action]) action = i;
    } else {
      action = sampleCategorical(probs, this.rng);
    }
    return { action, logp: Math.log(Math.max(probs[action], 1e-12)), value, probs };
  }

  value(obs: ArrayLike<number>): number {
    return this.critic.predict(obs)[0];
  }

  // ── Rollout collection ────────────────────────────────────────────────────

  /** Collect `steps` transitions by playing random windows from the given training environments. */
  collectRollout(
    envs: TradingEnv[],
    steps: number
  ): { batch: Transition[]; lastValue: number; episodeReturns: number[]; episodeRewards: number[] } {
    const batch: Transition[] = [];
    const episodeReturns: number[] = [];
    const episodeRewards: number[] = [];
    let env = envs[Math.floor(this.rng() * envs.length)];
    let obs = env.reset({ rng: this.rng });
    let epReward = 0;
    let lastValue = 0;

    while (batch.length < steps) {
      const { action, logp, value } = this.act(obs);
      const res = env.step(action);
      epReward += res.reward;
      let bootstrap = 0;
      if (res.done && res.truncated) bootstrap = this.value(res.obs);
      batch.push({ obs, action, logp, value, reward: res.reward, done: res.done, bootstrap });
      this.totalSteps++;
      if (res.done) {
        episodeReturns.push(res.equity / env.cfg.account.initialCash - 1);
        episodeRewards.push(epReward);
        epReward = 0;
        env = envs[Math.floor(this.rng() * envs.length)];
        obs = env.reset({ rng: this.rng });
      } else {
        obs = res.obs;
      }
    }
    lastValue = this.value(obs);
    return { batch, lastValue, episodeReturns, episodeRewards };
  }

  // ── PPO update ────────────────────────────────────────────────────────────

  /** Run PPO epochs on a batch of transitions (advantages computed internally). */
  update(batch: Transition[], lastValue: number): UpdateStats {
    const c = this.cfg;
    const n = batch.length;
    const { advantages, returns } = computeGAE(batch, c.gamma, c.lambda, lastValue);

    // Normalise advantages
    let mean = 0;
    for (const a of advantages) mean += a;
    mean /= n;
    let varA = 0;
    for (const a of advantages) varA += (a - mean) ** 2;
    const std = Math.sqrt(varA / n) + 1e-8;
    const advN = advantages.map((a) => (a - mean) / std);

    // Explained variance of the value function (diagnostic)
    let meanRet = 0;
    for (const r of returns) meanRet += r;
    meanRet /= n;
    let varRet = 0,
      varRes = 0;
    for (let i = 0; i < n; i++) {
      varRet += (returns[i] - meanRet) ** 2;
      varRes += (returns[i] - batch[i].value) ** 2;
    }
    const explainedVar = varRet > 1e-12 ? 1 - varRes / varRet : 0;

    const idx = Array.from({ length: n }, (_, i) => i);
    let sPolicy = 0,
      sValue = 0,
      sEnt = 0,
      sKL = 0,
      sClip = 0,
      count = 0;
    let stop = false;

    for (let epoch = 0; epoch < c.epochs && !stop; epoch++) {
      // shuffle
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      let epochKL = 0,
        epochN = 0;

      for (let s = 0; s < n; s += c.minibatch) {
        const mb = idx.slice(s, s + c.minibatch);
        this.actor.zeroGrad();
        this.critic.zeroGrad();

        for (const k of mb) {
          const tr = batch[k];
          const A = advN[k];

          // Actor
          const aActs = this.actor.forward(tr.obs);
          const logits = aActs[aActs.length - 1];
          const probs = softmax(logits);
          const logpNew = Math.log(Math.max(probs[tr.action], 1e-12));
          const ratio = Math.exp(logpNew - tr.logp);

          let H = 0;
          for (let j = 0; j < probs.length; j++) H -= probs[j] * Math.log(Math.max(probs[j], 1e-12));

          const unclippedActive = (A >= 0 && ratio <= 1 + c.clipEps) || (A < 0 && ratio >= 1 - c.clipEps);
          const dLdLogp = unclippedActive ? -ratio * A : 0;

          const dz = new Float64Array(probs.length);
          for (let j = 0; j < probs.length; j++) {
            const ind = j === tr.action ? 1 : 0;
            const pj = probs[j];
            // policy-gradient term + entropy bonus term (loss = -coef * H)
            dz[j] = dLdLogp * (ind - pj) + c.entropyCoef * pj * (Math.log(Math.max(pj, 1e-12)) + H);
          }
          this.actor.backward(aActs, dz);

          // Critic
          const cActs = this.critic.forward(tr.obs);
          const v = cActs[cActs.length - 1][0];
          const err = v - returns[k];
          this.critic.backward(cActs, [c.valueCoef * err]);

          const surr = Math.min(ratio * A, Math.max(1 - c.clipEps, Math.min(1 + c.clipEps, ratio)) * A);
          sPolicy += -surr;
          sValue += 0.5 * err * err;
          sEnt += H;
          const kl = tr.logp - logpNew;
          sKL += (Math.exp(kl) - 1) - kl; // low-variance KL estimator
          epochKL += (Math.exp(kl) - 1) - kl;
          epochN++;
          if (Math.abs(ratio - 1) > c.clipEps) sClip++;
          count++;
        }

        // Average + clip gradients + Adam step
        const m = mb.length;
        const aScale = Math.min(1, c.maxGradNorm / (this.actor.gradNorm() / m + 1e-12)) / m;
        const cScale = Math.min(1, c.maxGradNorm / (this.critic.gradNorm() / m + 1e-12)) / m;
        this.actor.step(c.lrActor, aScale);
        this.critic.step(c.lrCritic, cScale);
      }

      if (epochN > 0 && epochKL / epochN > c.targetKL * 1.5) stop = true;
    }

    this.updates++;
    return {
      policyLoss: sPolicy / Math.max(1, count),
      valueLoss: sValue / Math.max(1, count),
      entropy: sEnt / Math.max(1, count),
      approxKL: sKL / Math.max(1, count),
      clipFrac: sClip / Math.max(1, count),
      explainedVar,
    };
  }

  // ── Evaluation ─────────────────────────────────────────────────────────────

  /** Deterministic (greedy) backtest of the current policy on a price series segment. */
  evaluatePolicy(series: PriceSeries, envCfg: EnvConfig = DEFAULT_ENV_CONFIG, start?: number, end?: number): EvalResult {
    const env = new TradingEnv(series, envCfg);
    let obs = env.reset({ start: start ?? 0, end });
    const startBar = env.t;
    const equityCurve = [env.equity];
    const actions: number[] = [];
    const trades: EvalResult["trades"] = [];
    let done = false;
    while (!done) {
      const bar = env.t;
      const { action } = this.act(obs, true);
      const res = env.step(action);
      actions.push(action);
      if (res.trade) trades.push({ bar, side: res.trade.action as "BUY" | "SELL", price: res.trade.price, value: res.trade.value });
      equityCurve.push(res.equity);
      obs = res.obs;
      done = res.done;
    }
    const endBar = env.t;
    const p0 = series.prices[startBar];
    const buyHoldCurve: number[] = [];
    const bhShares = (envCfg.account.initialCash * (1 - envCfg.account.feeRate)) / (p0 * (1 + envCfg.account.slippage));
    for (let b = startBar; b <= endBar; b++) buyHoldCurve.push(bhShares * series.prices[b]);

    const initial = envCfg.account.initialCash;
    const finalEq = equityCurve[equityCurve.length - 1];
    const rets: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) rets.push(Math.log(equityCurve[i] / equityCurve[i - 1]));
    const mean = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
    const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1));
    let peak = -Infinity,
      maxDD = 0;
    for (const e of equityCurve) {
      peak = Math.max(peak, e);
      maxDD = Math.max(maxDD, 1 - e / peak);
    }
    const wins = env.closedTrades.filter((t) => t.pnlPct > 0).length;
    return {
      equityCurve,
      buyHoldCurve,
      actions,
      trades,
      closedTrades: env.closedTrades,
      totalReturn: finalEq / initial - 1,
      buyHoldReturn: buyHoldCurve[buyHoldCurve.length - 1] / initial - 1,
      sharpe: sd > 1e-12 ? (mean / sd) * Math.sqrt(252) : 0,
      maxDrawdown: maxDD,
      winRate: env.closedTrades.length ? wins / env.closedTrades.length : 0,
      nTrades: trades.length,
      startBar,
      endBar,
    };
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  snapshot(): AgentSnapshot {
    return {
      version: 1,
      config: this.cfg,
      actor: this.actor.toJSON(),
      critic: this.critic.toJSON(),
      updates: this.updates,
      totalSteps: this.totalSteps,
    };
  }

  static fromSnapshot(s: AgentSnapshot): PPOAgent {
    const agent = new PPOAgent({ ...DEFAULT_PPO_CONFIG, ...s.config }, s.actor.sizes[0]);
    agent.actor.loadState(s.actor);
    agent.critic.loadState(s.critic);
    agent.updates = s.updates;
    agent.totalSteps = s.totalSteps;
    return agent;
  }

  loadSnapshot(s: AgentSnapshot) {
    this.actor.loadState(s.actor);
    this.critic.loadState(s.critic);
    this.updates = s.updates;
    this.totalSteps = s.totalSteps;
  }
}
