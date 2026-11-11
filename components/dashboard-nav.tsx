"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { name: "Portfolio", href: "/dashboard" },
  { name: "Stocks", href: "/dashboard/stocks" },
  { name: "Crypto", href: "/dashboard/crypto" },
  { name: "Auto Trader", href: "/dashboard/auto-trader" },
  { name: "Journal", href: "/dashboard/journal" },
]

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-x-5 px-4 sm:px-6">
        <Link href="/dashboard" className="shrink-0 text-lg font-semibold tracking-tight text-foreground">
          EzFunds
        </Link>
        <nav aria-label="Main navigation" className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto border-t px-4 py-2 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:border-0 sm:px-0 sm:py-0">
          {navItems.map((item) => {
            const active = item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-label="Signed in as Areion">
            <User className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden text-sm font-medium sm:inline">Areion</span>
          <Button variant="ghost" size="icon" onClick={() => router.push("/")} aria-label="Log out" className="h-9 w-9 text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
