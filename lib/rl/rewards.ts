// Reward & penalty shaping for the RL trading agent.
// The agent learns purely from this signal, so each term is explicit and tunable.

export interface RewardConfig {
  /** Weight on step PnL (100 × log equity return). */
  pnlWeight: number;
  /** Flat penalty each time the agent trades (discourages over-trading on top of real fees). */
  tradePenalty: number;
  /** Penalty for an invalid action (buy with no cash / sell with nothing held). */
  invalidPenalty: number;
  /** Drawdown (fraction) above which a per-step penalty kicks in. */
  drawdownThreshold: number;
  /** Penalty slope for drawdown beyond the threshold. */
  drawdownPenalty: number;
  /** Per-step penalty for sitting on a position that is underwater beyond `underwaterThreshold`. */
  underwaterPenalty: number;
  underwaterThreshold: number;
  /** Bonus (win) / penalty (loss) proportional to the realised % result of a closed trade. */
  realizedWeight: number;
  /** One-off penalty if the account is wiped down to `ruinLevel` of starting equity. */
  ruinPenalty: number;
  ruinLevel: number;
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  pnlWeight: 1,
  tradePenalty: 0.02,
  invalidPenalty: 0.05,
  drawdownThreshold: 0.08,
  drawdownPenalty: 0.5,
  underwaterPenalty: 0.3,
  underwaterThreshold: 0.03,
  realizedWeight: 0.1,
  ruinPenalty: 5,
  ruinLevel: 0.5,
};

export interface TradeInfo {
  traded: boolean;
  invalid: boolean;
  /** Realised result (fraction) if this action closed/reduced a position, else null. */
  realizedPct: number | null;
}

export interface RewardBreakdown {
  pnl: number;
  tradeCost: number;
  invalid: number;
  drawdown: number;
  underwater: number;
  realized: number;
  ruin: number;
  total: number;
}

export function computeReward(
  p: {
    equityBefore: number;
    equityAfter: number;
    peakEquity: number;
    unrealizedPct: number;
    initialEquity: number;
    info: TradeInfo;
  },
  cfg: RewardConfig
): RewardBreakdown {
  const pnl = cfg.pnlWeight * 100 * Math.log(Math.max(p.equityAfter, 1e-9) / Math.max(p.equityBefore, 1e-9));
  const tradeCost = p.info.traded ? -cfg.tradePenalty : 0;
  const invalid = p.info.invalid ? -cfg.invalidPenalty : 0;

  const dd = p.peakEquity > 0 ? Math.max(0, 1 - p.equityAfter / p.peakEquity) : 0;
  const drawdown = -cfg.drawdownPenalty * Math.max(0, dd - cfg.drawdownThreshold) * 10;

  const underwater =
    p.unrealizedPct < -cfg.underwaterThreshold
      ? -cfg.underwaterPenalty * (-p.unrealizedPct - cfg.underwaterThreshold) * 10
      : 0;

  const realized = p.info.realizedPct !== null ? cfg.realizedWeight * p.info.realizedPct * 100 : 0;

  const ruin = p.equityAfter < p.initialEquity * cfg.ruinLevel ? -cfg.ruinPenalty : 0;

  return {
    pnl,
    tradeCost,
    invalid,
    drawdown,
    underwater,
    realized,
    ruin,
    total: pnl + tradeCost + invalid + drawdown + underwater + realized + ruin,
  };
}
