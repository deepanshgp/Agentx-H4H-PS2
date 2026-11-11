import RLTradingAgent from "@/components/rl-trading-agent";

export const metadata = {
  title: "RL Trading Agent | EzFunds",
  description: "Self-learning reinforcement-learning (PPO) trading agent",
};

export default function RLAgentPage() {
  return <RLTradingAgent />;
}
