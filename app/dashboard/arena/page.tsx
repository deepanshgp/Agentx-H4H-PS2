import ArenaMode from "@/components/arena-mode"

export default function ArenaPage() {
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Arena</h1>
        <p className="mt-1 text-sm text-muted-foreground">Run trading agents head to head in a simulated market.</p>
      </header>
      <ArenaMode />
    </section>
  )
}
