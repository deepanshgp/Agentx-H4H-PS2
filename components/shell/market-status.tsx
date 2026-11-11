"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/** NSE equity session: Mon–Fri 09:15–15:30 IST (does not account for exchange holidays). */
function nseOpen(now: Date) {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }))
  const day = ist.getDay()
  const mins = ist.getHours() * 60 + ist.getMinutes()
  return day >= 1 && day <= 5 && mins >= 9 * 60 + 15 && mins < 15 * 60 + 30
}

export function MarketStatus({ className }: { className?: string }) {
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    const tick = () => setOpen(nseOpen(new Date()))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  if (open === null) return null

  return (
    <div className={cn("flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium", className)} role="status">
      <span className="relative flex h-2 w-2">
        <span className={cn("absolute inline-flex h-full w-full rounded-full", open ? "animate-pulse-dot bg-gain" : "bg-muted-foreground/50")} />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", open ? "bg-gain" : "bg-muted-foreground/60")} />
      </span>
      <span>NSE {open ? "open" : "closed"}</span>
      <span className="text-muted-foreground">· Crypto 24/7</span>
    </div>
  )
}
