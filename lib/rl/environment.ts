// Gym-style trading environment over a historical price series.

import {
  Account,
  AccountConfig,
  DEFAULT_ACCOUNT_CONFIG,
  ExecutedTrade,
  applyAction,
  equityAt,
  markToMarket,
  newAccount,
  positionView,
} from "./account";
import { WARMUP, buildObservation, precomputeMarketFeatures } from "./features";
import { DEFAULT_REWARD_CONFIG, RewardBreakdown, RewardConfig, computeReward } from "./rewards";
import type { RNG } from "./nn";

export interface PriceSeries {
  prices: number[];
  /** Optional unix-ms timestamps aligned with prices (for display). */
  timestamps?: number[];
  label?: string;
}

export interface ClosedTrade {
  entryBar: number;
  exitBar: number;
  pnlPct: number;
  barsHeld: number;
}

export interface StepResult {
  obs: number[];
  reward: number;
  done: boolean;
  /** True if the episode ended because the time limit was reached (not a real terminal state). */
  truncated: boolean;
  breakdown: RewardBreakdown;
  trade: ExecutedTrade | null;
  equity: number;
}

export interface EnvConfig {
  account: AccountConfig;
  reward: RewardConfig;
  /** Bars per training episode. */
  episodeLength: number;
}

export const DEFAULT_ENV_CONFIG: EnvConfig = {
  account: DEFAULT_ACCOUNT_CONFIG,
  reward: DEFAULT_REWARD_CONFIG,
  episodeLength: 120,
};

export class TradingEnv {
  private feats: (number[] | null)[];
  private acct!: Account;
  t = 0;
  private endT = 0;
  private entryBar = -1;
  closedTrades: ClosedTrade[] = [];

  constructor(public series: PriceSeries, public cfg: EnvConfig = DEFAULT_ENV_CONFIG) {
    if (series.prices.length < WARMUP + 5) throw new Error("Price series too short for the environment");
    this.feats = precomputeMarketFeatures(series.prices);
  }

  get maxStart() {
    return this.series.prices.length - this.cfg.episodeLength - 1;
  }

  get equity() {
    return equityAt(this.acct, this.series.prices[this.t]);
  }

  get account() {
    return this.acct;
  }

  private obs(): number[] {
    const price = this.series.prices[this.t];
    return buildObservation(this.feats[this.t]!, positionView(this.acct, price));
  }

  /**
   * Reset the environment.
   * - start given: begin at that bar, run until `end` (or the end of the series).
   * - otherwise: random window of `episodeLength` bars.
   */
  reset(opts: { rng?: RNG; start?: number; end?: number } = {}): number[] {
    const n = this.series.prices.length;
    if (opts.start !== undefined) {
      this.t = Math.max(WARMUP, opts.start);
      this.endT = Math.min(n - 1, opts.end ?? n - 1);
    } else {
      const hi = Math.max(WARMUP, this.maxStart);
      const rng = opts.rng ?? Math.random;
      this.t = WARMUP + Math.floor(rng() * (hi - WARMUP + 1));
      this.endT = Math.min(n - 1, this.t + this.cfg.episodeLength);
    }
    this.acct = newAccount(this.cfg.account);
    this.entryBar = -1;
    this.closedTrades = [];
    return this.obs();
  }

  step(action: number): StepResult {
    const prices = this.series.prices;
    const price = prices[this.t];
    const eqBefore = equityAt(this.acct, price);
    const hadPosition = this.acct.shares > 0;

    const { info, trade } = applyAction(this.acct, action, price, this.cfg.account);
    if (trade?.action === "BUY" && !hadPosition) this.entryBar = this.t;
    if (trade?.action === "SELL" && info.realizedPct !== null && this.acct.shares === 0) {
      this.closedTrades.push({
        entryBar: this.entryBar,
        exitBar: this.t,
        pnlPct: info.realizedPct,
        barsHeld: this.t - this.entryBar,
      });
      this.entryBar = -1;
    }

    this.t += 1;
    const newPrice = prices[this.t];
    markToMarket(this.acct, newPrice);
    const eqAfter = equityAt(this.acct, newPrice);
    const pv = positionView(this.acct, newPrice);

    const breakdown = computeReward(
      {
        equityBefore: eqBefore,
        equityAfter: eqAfter,
        peakEquity: this.acct.peakEquity,
        unrealizedPct: pv.unrealizedPct,
        initialEquity: this.cfg.account.initialCash,
        info,
      },
      this.cfg.reward
    );

    const ruined = eqAfter < this.cfg.account.initialCash * this.cfg.reward.ruinLevel;
    const timeUp = this.t >= this.endT;
    const done = ruined || timeUp;
    return {
      obs: this.obs(),
      reward: breakdown.total,
      done,
      truncated: timeUp && !ruined,
      breakdown,
      trade,
      equity: eqAfter,
    };
  }
}
