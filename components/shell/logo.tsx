import Link from "next/link"
import { cn } from "@/lib/utils"

export function Logo({ className, href = "/dashboard" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg", className)} aria-label="EzFunds home">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-4 text-sm font-bold text-white shadow-glow">
        Ez
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Ez<span className="text-brand">Funds</span>
      </span>
    </Link>
  )
}
