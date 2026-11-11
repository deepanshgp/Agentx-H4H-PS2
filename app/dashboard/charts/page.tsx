import LiveChartView from "@/components/live-chart-view";

export const metadata = {
  title: "Live Chart | EzFunds",
  description: "Daily candlestick chart with RL agent trade markers",
};

export default function ChartsPage() {
  return <LiveChartView />;
}
