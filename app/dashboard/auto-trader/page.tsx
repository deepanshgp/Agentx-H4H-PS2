import TradingAgentPanel from "@/components/trading-agent-panel"

export default function AutoTraderPage() {
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Auto Trader</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and manage your automated trading activity.</p>
      </header>
      <TradingAgentPanel />
    </section>
  )
}
