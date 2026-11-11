// Single-asset paper account shared by the training environment and the live paper-trading loop,
// so the agent experiences identical mechanics (fees, slippage, sizing) in both.

import type { PositionView } from "./features";
import type { TradeInfo } from "./rewards";

export const ACTIONS = ["HOLD", "BUY", "SELL"] as const;
export type ActionName = (typeof ACTIONS)[number];
export const N_ACTIONS = 3;

export interface AccountConfig {
  initialCash: number;
  /** Proportional fee per trade side (0.001 = 0.1%). */
  feeRate: number;
  /** Adverse price slippage per trade (0.0005 = 0.05%). */
  slippage: number;
  /** BUY invests this fraction of the remaining cash. */
  buyFraction: number;
  /** SELL liquidates this fraction of the position. */
  sellFraction: number;
}

export const DEFAULT_ACCOUNT_CONFIG: AccountConfig = {
  initialCash: 100000,
  feeRate: 0.001,
  slippage: 0.0005,
  buyFraction: 0.5,
  sellFraction: 1.0,
};

export interface Account {
  cash: number;
  shares: number;
  /** Cost basis per share of the open position (incl. fees). */
  avgCost: number;
  barsHeld: number;
  peakEquity: number;
}

export function newAccount(cfg: AccountConfig): Account {
  return { cash: cfg.initialCash, shares: 0, avgCost: 0, barsHeld: 0, peakEquity: cfg.initialCash };
}

export function equityAt(a: Account, price: number): number {
  return a.cash + a.shares * price;
}

export function positionView(a: Account, price: number): PositionView {
  const eq = equityAt(a, price);
  return {
    exposure: eq > 0 ? (a.shares * price) / eq : 0,
    unrealizedPct: a.shares > 0 && a.avgCost > 0 ? price / a.avgCost - 1 : 0,
    barsHeld: a.barsHeld,
    drawdown: a.peakEquity > 0 ? Math.max(0, 1 - eq / a.peakEquity) : 0,
  };
}

export interface ExecutedTrade {
  action: ActionName;
  price: number; // effective fill price
  shares: number;
  value: number;
  fee: number;
}

/** Apply an action at `price` (mutates account). */
export function applyAction(
  a: Account,
  action: number,
  price: number,
  cfg: AccountConfig
): { info: TradeInfo; trade: ExecutedTrade | null } {
  const info: TradeInfo = { traded: false, invalid: false, realizedPct: null };
  let trade: ExecutedTrade | null = null;

  if (action === 1) {
    // BUY
    const spend = a.cash * cfg.buyFraction;
    if (spend < 1) {
      info.invalid = true;
    } else {
      const fill = price * (1 + cfg.slippage);
      const fee = spend * cfg.feeRate;
      const qty = (spend - fee) / fill;
      const newShares = a.shares + qty;
      a.avgCost = (a.avgCost * a.shares + spend) / newShares; // includes fee
      a.shares = newShares;
      a.cash -= spend;
      info.traded = true;
      trade = { action: "BUY", price: fill, shares: qty, value: spend, fee };
    }
  } else if (action === 2) {
    // SELL
    if (a.shares * price < 1) {
      info.invalid = true;
    } else {
      const qty = a.shares * cfg.sellFraction;
      const fill = price * (1 - cfg.slippage);
      const gross = qty * fill;
      const fee = gross * cfg.feeRate;
      const net = gross - fee;
      info.realizedPct = net / (qty * a.avgCost) - 1;
      a.cash += net;
      a.shares -= qty;
      info.traded = true;
      trade = { action: "SELL", price: fill, shares: qty, value: net, fee };
      if (a.shares * price < 1) {
        a.cash += a.shares * price; // dust
        a.shares = 0;
        a.avgCost = 0;
        a.barsHeld = 0;
      }
    }
  }
  return { info, trade };
}

/** Advance one bar after the action: updates holding time and the equity peak. */
export function markToMarket(a: Account, price: number) {
  if (a.shares > 0) a.barsHeld += 1;
  a.peakEquity = Math.max(a.peakEquity, equityAt(a, price));
}
