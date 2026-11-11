import AgentDebatePanel from "@/components/agent-debate-panel"

export default function DebatePage() {
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Debate</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compare perspectives from multiple market agents.</p>
      </header>
      <AgentDebatePanel />
    </section>
  )
}
