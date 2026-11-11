"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHash } from "@/hooks/use-hash"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Logo } from "./logo"
import { NavList } from "./nav-list"
import { ALL_NAV_ITEMS, MOBILE_TABS, isNavActive } from "./nav-config"

/** Hamburger that opens the full navigation as a drawer (< lg). */
export function MobileMenuButton() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-0">
        <SheetHeader className="border-b border-sidebar-border px-5 py-4 text-left">
          <SheetTitle><Logo href="/dashboard" /></SheetTitle>
        </SheetHeader>
        <div className="px-3 py-5">
          <NavList onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Thumb-reach tab bar (< lg). 4 pinned destinations + "More" (opens the drawer). */
export function MobileTabBar() {
  const pathname = usePathname()
  const hash = useHash()
  const [open, setOpen] = useState(false)

  const tabs = MOBILE_TABS.map((n) => ALL_NAV_ITEMS.find((i) => i.name === n)!).filter(Boolean)

  return (
    <nav
      aria-label="Quick navigation"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((item) => {
          const active = isNavActive(item, pathname, hash)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors", active ? "text-brand" : "text-muted-foreground")}
              >
                <item.icon className="h-5 w-5" aria-hidden />
                {item.name}
              </Link>
            </li>
          )
        })}
        <li>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" aria-hidden />
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-sidebar px-3 pb-8">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle>All sections</SheetTitle>
              </SheetHeader>
              <NavList onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  )
}
