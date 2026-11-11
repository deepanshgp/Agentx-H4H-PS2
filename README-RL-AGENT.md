# Self-Learning RL Trading Agent

Uses Reinforcement Learning (**PPO**) to learn from rewards, penalties, and historical trading outcomes.

Open it from the dashboard nav: **RL Agent** → `/dashboard/rl-agent`.

> Paper trading / education only. The agent never places real orders and never touches your real portfolio.
> RL on price data frequently fails to beat buy & hold on unseen data — judge it by the **held-out validation** numbers.

## What it does

| Stage | What happens |
|-------|--------------|
| **Train (offline)** | PPO plays thousands of simulated trading days on historical prices (CoinGecko / Yahoo Finance via `/api/rl/history`), optionally mixed with synthetic bull/bear/range/chop regimes. It is validated on the most recent 25% of history that is *never* trained on, and the best-validation checkpoint is kept. |
| **Live Learning (online)** | The agent paper-trades current prices. One cycle after each decision, the real price move is turned into a reward/penalty and stored; every 24 settled outcomes a (low learning-rate) PPO update adjusts the policy. The model is saved to `localStorage` after each update, so it keeps improving across sessions. |
| **Outcomes & Rewards** | Log of every reward/penalty with its breakdown, PPO update events, and a memory of closed-trade results (win rate, avg win/loss). |

## The learning signal

**Observation (14 features):** 1/3/5/10/20-bar volatility-normalised returns, volatility ratio, RSI(14), trend vs SMA20, MACD, Bollinger position — plus the agent's own exposure, unrealised P&L, bars held and drawdown. No look-ahead.

**Actions:** `HOLD`, `BUY` (invest 50% of remaining cash), `SELL` (exit position). Fees (0.1%) and slippage (0.05%) are applied.

**Reward (`lib/rl/rewards.ts`, all weights tunable):**

- **+** daily equity growth (100 × log return)
- **+/−** 0.1 × realised % of each closed trade (wins rewarded, losses penalised)
- **−** flat trade penalty (default 0.02) on top of real fees → discourages over-trading
- **−** drawdown beyond 8% of peak equity
- **−** holding a position that is down more than 3%
- **−** invalid actions (buy with no cash / sell with nothing)
- **−** large penalty if equity falls below 50% of the start

## Algorithm

Actor-critic (two 64×64 tanh MLPs), PPO-Clip (ε = 0.2), GAE (γ = 0.99, λ = 0.95), entropy bonus, advantage normalisation, global grad-norm clipping, Adam, KL early-stopping. Written in dependency-free TypeScript with hand-written backprop (verified against numerical gradients) — **no new npm packages**.

## Files

```
lib/rl/nn.ts            MLP + Adam + seeded RNG
lib/rl/features.ts      feature engineering
lib/rl/rewards.ts       reward / penalty shaping
lib/rl/account.ts       paper account (fees, slippage, sizing)
lib/rl/environment.ts   gym-style trading environment
lib/rl/ppo.ts           PPO agent (GAE, clipped objective, eval, snapshot)
lib/rl/trainer.ts       offline training loop + walk-forward validation
lib/rl/live.ts          live self-learning loop (settle → act → online PPO update)
lib/rl/store.ts         localStorage persistence (model, memory, events)
lib/rl/synthetic-data.ts  regime-switching price generator
lib/rl/data-client.ts   browser history loader
app/api/rl/history/     server-side price-history proxy (falls back to synthetic, and says so)
components/rl-trading-agent.tsx   UI
app/dashboard/rl-agent/page.tsx   page
scripts/rl-selftest.ts  engine tests
```

## Verify

```bash
npm run rl:test
```

Checks: backprop vs numerical gradients, GAE, environment accounting, that PPO improves reward and **beats buy & hold on held-out data** on a learnable regime series, model save/load, and that the live loop settles rewards and performs online updates.

## Notes

- If live history can't be fetched (offline / rate-limited), the API returns a *simulated* series flagged `source: "synthetic"`; the UI warns when this happens and Live Learning refuses to trade on non-live data unless you switch on **Demo mode** (simulated ticks).
- Model + data live in the browser's `localStorage` (keys prefixed `rl.`). The reset button on the Train tab wipes them.
- No API keys are required.
