"use client"

import { useRouter } from "next/navigation"
import TradeJournal from "@/components/trade-journal"

export default function JournalPage() {
  const router = useRouter()

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review your trading history and notes.</p>
      </header>
      <TradeJournal onNavigateToConfig={() => router.push("/dashboard/auto-trader")} />
    </section>
  )
}
