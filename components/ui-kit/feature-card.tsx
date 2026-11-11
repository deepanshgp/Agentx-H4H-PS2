import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Accent = "violet" | "teal" | "amber" | "blue"

const accents: Record<Accent, { icon: string; ring: string; glow: string }> = {
  violet: { icon: "bg-chart-1/15 text-chart-1", ring: "hover:border-chart-1/40", glow: "from-chart-1/10" },
  teal: { icon: "bg-chart-2/15 text-chart-2", ring: "hover:border-chart-2/40", glow: "from-chart-2/10" },
  amber: { icon: "bg-chart-3/15 text-chart-3", ring: "hover:border-chart-3/40", glow: "from-chart-3/10" },
  blue: { icon: "bg-chart-5/15 text-chart-5", ring: "hover:border-chart-5/40", glow: "from-chart-5/10" },
}

interface FeatureCardProps {
  href: string
  icon: ReactNode
  title: string
  description: string
  cta?: string
  accent?: Accent
  bullets?: { icon: ReactNode; title: string; subtitle: string }[]
  className?: string
}

/** Big promo/entry card for AI tools (replaces the purple / blue blocks). */
export function FeatureCard({ href, icon, title, description, cta = "Open", accent = "violet", bullets, className }: FeatureCardProps) {
  const a = accents[accent]

  return (
    <Link
      href={href}
      className={cn(
        "group relative block overflow-hidden rounded-xl border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop",
        a.ring,
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-80", a.glow)} />
      <div className="relative">
        <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl", a.icon)}>{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>

        {bullets && (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {bullets.map((b) => (
              <li key={b.title} className="flex items-center gap-3 rounded-lg border bg-background/60 p-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", a.icon)}>{b.icon}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{b.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{b.subtitle}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </div>
    </Link>
  )
}
