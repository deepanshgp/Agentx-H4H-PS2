import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionCardProps {
  title?: ReactNode
  description?: ReactNode
  /** right side of the header: link, button, segmented control */
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  /** remove inner padding (tables, charts that go edge to edge) */
  flush?: boolean
}

/** The one card pattern for the whole app. Use instead of hand-rolled <Card><CardHeader>… */
export function SectionCard({ title, description, action, children, className, contentClassName, flush }: SectionCardProps) {
  return (
    <section className={cn("rounded-xl border bg-card text-card-foreground shadow-card", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pb-0 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold leading-tight">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={cn(flush ? "pt-4" : "p-5", title || action ? (flush ? "" : "pt-4") : "", contentClassName)}>
        {children}
      </div>
    </section>
  )
}
