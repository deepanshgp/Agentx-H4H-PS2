"use client"

import { usePathname } from "next/navigation"
import { useHash } from "@/hooks/use-hash"
import { CommandMenu } from "./command-menu"
import { MarketStatus } from "./market-status"
import { MobileMenuButton } from "./mobile-nav"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"
import { Logo } from "./logo"
import { findActive } from "./nav-config"

export function Topbar() {
  const pathname = usePathname()
  const hash = useHash()
  const current = findActive(pathname, hash)

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <MobileMenuButton />
      <Logo className="lg:hidden" />
      <h2 className="hidden text-sm font-medium text-muted-foreground lg:block">{current?.name ?? "Dashboard"}</h2>
      <div className="ml-auto flex items-center gap-2">
        <MarketStatus className="hidden xl:flex" />
        <CommandMenu />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
