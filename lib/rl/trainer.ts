// Offline training loop: PPO on historical (and optionally synthetic) price data,
// with walk-forward validation on a held-out tail and best-checkpoint tracking.

import { PPOAgent, PPOConfig, DEFAULT_PPO_CONFIG, UpdateStats, EvalResult, AgentSnapshot } from "./ppo";
import { DEFAULT_ENV_CONFIG, EnvConfig, PriceSeries, TradingEnv } from "./environment";
import { generateSyntheticPrices } from "./synthetic-data";
import { WARMUP } from "./features";

export interface TrainOptions {
  iterations: number;
  /** Fraction of the real series (from the end) held out for validation. */
  validationFraction: number;
  /** Number of synthetic regime series mixed into the training pool (0 = real data only). */
  syntheticSeries: number;
  /** Validate every N iterations. */
  evalEvery: number;
  envConfig: EnvConfig;
  seed: number;
  /** Other assets to also learn from (only their pre-validation-period portion is used). */
  extraSeries?: PriceSeries[];
}

export const DEFAULT_TRAIN_OPTIONS: TrainOptions = {
  iterations: 60,
  validationFraction: 0.25,
  syntheticSeries: 3,
  evalEvery: 3,
  envConfig: DEFAULT_ENV_CONFIG,
  seed: 7,
};

export interface TrainProgress {
  iteration: number;
  totalIterations: number;
  stats: UpdateStats;
  meanEpisodeReturn: number; // fraction, over episodes finished in this rollout
  meanEpisodeReward: number;
  validation?: { totalReturn: number; buyHoldReturn: number; sharpe: number; maxDrawdown: number; nTrades: number };
  isBest: boolean;
  totalSteps: number;
}

export interface TrainResult {
  history: TrainProgress[];
  best: { iteration: number; validationReturn: number; snapshot: AgentSnapshot } | null;
  validation: EvalResult | null;
  /** Series split info for display. */
  split: { trainEnd: number; total: number };
}

const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0));

export function splitSeries(series: PriceSeries, validationFraction: number): { train: PriceSeries; val: PriceSeries; trainEnd: number } {
  const n = series.prices.length;
  const minVal = WARMUP + 30;
  let trainEnd = Math.floor(n * (1 - validationFraction));
  trainEnd = Math.min(trainEnd, n - minVal);
  trainEnd = Math.max(trainEnd, WARMUP + 40);
  // The validation slice keeps WARMUP bars of context before the held-out period starts,
  // so features are valid from the first held-out bar without leaking future data.
  const valStart = Math.max(0, trainEnd - WARMUP);
  return {
    train: {
      prices: series.prices.slice(0, trainEnd),
      timestamps: series.timestamps?.slice(0, trainEnd),
      label: series.label,
    },
    val: {
      prices: series.prices.slice(valStart),
      timestamps: series.timestamps?.slice(valStart),
      label: series.label,
    },
    trainEnd,
  };
}

export async function trainAgent(
  agent: PPOAgent,
  series: PriceSeries,
  opts: TrainOptions = DEFAULT_TRAIN_OPTIONS,
  hooks: { onProgress?: (p: TrainProgress) => void; shouldStop?: () => boolean } = {}
): Promise<TrainResult> {
  const { train, val, trainEnd } = splitSeries(series, opts.validationFraction);

  // Build training pool: the real training split + synthetic regimes of similar length
  const envs: TradingEnv[] = [new TradingEnv(train, opts.envConfig)];
  for (let i = 0; i < opts.syntheticSeries; i++) {
    const prices = generateSyntheticPrices(Math.max(400, train.prices.length), opts.seed * 1000 + i, train.prices[0] || 100);
    envs.push(new TradingEnv({ prices, label: `synthetic-${i}` }, opts.envConfig));
  }
  // Additional real assets: use only the leading (training) fraction so no future data leaks in
  for (const extra of opts.extraSeries ?? []) {
    const cut = Math.floor(extra.prices.length * (1 - opts.validationFraction));
    if (cut >= WARMUP + 60) {
      envs.push(new TradingEnv({ prices: extra.prices.slice(0, cut), label: extra.label }, opts.envConfig));
    }
  }
  // weight the primary real data more heavily by listing it twice
  envs.push(envs[0]);

  const history: TrainProgress[] = [];
  let best: TrainResult["best"] = null;
  let lastEval: EvalResult | null = null;

  for (let it = 1; it <= opts.iterations; it++) {
    if (hooks.shouldStop?.()) break;

    const { batch, lastValue, episodeReturns, episodeRewards } = agent.collectRollout(envs, agent.cfg.stepsPerUpdate);
    const stats = agent.update(batch, lastValue);
    const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

    const progress: TrainProgress = {
      iteration: it,
      totalIterations: opts.iterations,
      stats,
      meanEpisodeReturn: mean(episodeReturns),
      meanEpisodeReward: mean(episodeRewards),
      isBest: false,
      totalSteps: agent.totalSteps,
    };

    if (it % opts.evalEvery === 0 || it === opts.iterations) {
      lastEval = agent.evaluatePolicy(val, opts.envConfig, WARMUP);
      progress.validation = {
        totalReturn: lastEval.totalReturn,
        buyHoldReturn: lastEval.buyHoldReturn,
        sharpe: lastEval.sharpe,
        maxDrawdown: lastEval.maxDrawdown,
        nTrades: lastEval.nTrades,
      };
      if (!best || lastEval.totalReturn > best.validationReturn) {
        best = { iteration: it, validationReturn: lastEval.totalReturn, snapshot: agent.snapshot() };
        progress.isBest = true;
      }
    }

    history.push(progress);
    hooks.onProgress?.(progress);
    await yieldToUI();
  }

  return { history, best, validation: lastEval, split: { trainEnd, total: series.prices.length } };
}

export { DEFAULT_PPO_CONFIG };
export type { PPOConfig };
