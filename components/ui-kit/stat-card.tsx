import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Pnl } from "./pnl"

interface StatCardProps {
  label: string
  /** already formatted, e.g. formatINR(x) */
  value: ReactNode
  /** % change; omit to hide */
  change?: number | null
  changeLabel?: string
  hint?: ReactNode
  icon?: ReactNode
  tone?: "default" | "brand" | "gain" | "loss" | "warning" | "info"
  loading?: boolean
  className?: string
}

const toneIcon: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-secondary text-foreground",
  brand: "bg-primary/10 text-brand",
  gain: "bg-gain/10 text-gain",
  loss: "bg-loss/10 text-loss",
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
}

export function StatCard({ label, value, change, changeLabel = "vs last month", hint, icon, tone = "default", loading, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-primary/30", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneIcon[tone])}>{icon}</div>}
      </div>
      {loading ? (
        <>
          <Skeleton className="mt-3 h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-24" />
        </>
      ) : (
        <>
          <p className="num mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {change !== undefined && change !== null && (
              <>
                <Pnl value={change} variant="pill" size="sm" />
                <span>{changeLabel}</span>
              </>
            )}
            {hint && <span>{hint}</span>}
          </div>
        </>
      )}
    </div>
  )
}
