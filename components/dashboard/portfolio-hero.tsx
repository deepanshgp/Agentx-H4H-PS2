import Link from "next/link"
import { ArrowRight, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pnl } from "@/components/ui-kit/pnl"
import { formatINR } from "@/lib/format"

interface PortfolioHeroProps {
  stocks: number
  crypto: number
  web3: number
  /** monthly % changes from calculateMonthlyChange() */
  changes: { total: number; stocks: number; crypto: number }
}

export function PortfolioHero({ stocks, crypto, web3, changes }: PortfolioHeroProps) {
  const total = stocks + crypto + web3
  const segments = [
    { key: "stocks", label: "Stocks", value: stocks, change: changes.stocks as number | undefined, color: "bg-chart-1" },
    { key: "crypto", label: "Crypto", value: crypto, change: changes.crypto as number | undefined, color: "bg-chart-2" },
    { key: "web3", label: "Web3", value: web3, change: undefined, color: "bg-chart-3" },
  ]

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="relative">
        <p id="hero-title" className="text-sm font-medium text-muted-foreground">Total portfolio value</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
          <p className="num text-4xl font-semibold tracking-tight sm:text-5xl">{formatINR(total)}</p>
          <div className="mb-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <Pnl value={changes.total} variant="pill" size="md" />
            <span>this month</span>
          </div>
        </div>

        {total > 0 ? (
          <>
            {/* allocation bar */}
            <div className="mt-6 flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={segments.map((s) => `${s.label} ${((s.value / total) * 100).toFixed(0)}%`).join(", ")}>
              {segments.filter((s) => s.value > 0).map((s) => (
                <div key={s.key} className={`${s.color} transition-all duration-700`} style={{ width: `${(s.value / total) * 100}%` }} />
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              {segments.map((s) => (
                <div key={s.key} className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`h-2 w-2 rounded-full ${s.color}`} aria-hidden />
                    {s.label}
                    <span className="num">· {((s.value / total) * 100).toFixed(0)}%</span>
                  </dt>
                  <dd className="num mt-1 truncate text-sm font-semibold sm:text-base">{formatINR(s.value)}</dd>
                  {s.change !== undefined && <Pnl value={s.change} size="sm" />}
                </div>
              ))}
            </dl>
          </>
        ) : (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-brand"><Wallet className="h-5 w-5" /></div>
            <p className="flex-1 text-sm text-muted-foreground">Your portfolio is empty. Buy your first stock or crypto to see your allocation here.</p>
            <div className="flex gap-2">
              <Button asChild size="sm"><Link href="/dashboard/stocks">Browse stocks</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/dashboard/crypto">Browse crypto</Link></Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild size="sm" className="gap-1.5"><Link href="/dashboard/stocks">Invest <ArrowRight className="h-3.5 w-3.5" /></Link></Button>
          <Button asChild size="sm" variant="secondary"><Link href="/dashboard/portfolio-optimizer">Optimize portfolio</Link></Button>
        </div>
      </div>
    </section>
  )
}
