import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPct } from "@/lib/format"

interface PnlProps {
  /** percentage (e.g. 1.25 = +1.25%) */
  value: number | null | undefined
  /** "text" = coloured text · "pill" = tinted rounded badge */
  variant?: "text" | "pill"
  size?: "sm" | "md" | "lg"
  decimals?: number
  /** custom label (e.g. "₹1,200") – colour/arrow still come from `value` */
  label?: string
  hideIcon?: boolean
  className?: string
}

/**
 * Gain / loss indicator. Never relies on colour alone: arrow + sign + sr-only text.
 */
export function Pnl({ value, variant = "text", size = "md", decimals = 2, label, hideIcon, className }: PnlProps) {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0
  const dir = v > 0 ? "up" : v < 0 ? "down" : "flat"
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus
  const text = label ?? formatPct(v, decimals)

  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 font-medium",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-base",
        dir === "up" && "text-gain",
        dir === "down" && "text-loss",
        dir === "flat" && "text-muted-foreground",
        variant === "pill" && "rounded-full px-2 py-0.5",
        variant === "pill" && dir === "up" && "bg-gain/10",
        variant === "pill" && dir === "down" && "bg-loss/10",
        variant === "pill" && dir === "flat" && "bg-muted",
        className,
      )}
    >
      {!hideIcon && <Icon className={cn("shrink-0", size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5")} aria-hidden />}
      <span className="sr-only">{dir === "up" ? "Up " : dir === "down" ? "Down " : "Unchanged "}</span>
      {text}
    </span>
  )
}
