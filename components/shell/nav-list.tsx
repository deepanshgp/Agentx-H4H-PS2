"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useHash } from "@/hooks/use-hash"
import { NAV_GROUPS, isNavActive } from "./nav-config"

/** Grouped navigation – shared by the desktop sidebar and the mobile sheet. */
export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const hash = useHash()

  return (
    <nav aria-label="Main" className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavActive(item, pathname, hash)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={(e) => {
                      // hash-only links inside /dashboard: pushState doesn't fire `hashchange`, so do it ourselves
                      if (item.href.includes("#") && pathname === "/dashboard") {
                        e.preventDefault()
                        window.history.pushState(null, "", item.href)
                        window.dispatchEvent(new HashChangeEvent("hashchange"))
                      }
                      onNavigate?.()
                    }}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" aria-hidden />}
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand" : "text-sidebar-foreground/60 group-hover:text-brand")} aria-hidden />
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">{item.badge}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
