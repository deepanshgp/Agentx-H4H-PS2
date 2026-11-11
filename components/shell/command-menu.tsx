"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Search, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { NAV_GROUPS } from "./nav-config"

/** Search trigger + ⌘K / Ctrl+K palette to jump anywhere. */
export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme } = useTheme()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    if (href.includes("#") && window.location.pathname === "/dashboard") {
      window.history.pushState(null, "", href)
      window.dispatchEvent(new HashChangeEvent("hashchange"))
    } else router.push(href)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-64 justify-start gap-2 bg-muted/40 px-3 text-sm font-normal text-muted-foreground md:flex"
        aria-label="Search pages and actions"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium">⌘K</kbd>
      </Button>
      <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" onClick={() => setOpen(true)} aria-label="Search">
        <Search className="h-[18px] w-[18px]" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a page or action…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {NAV_GROUPS.map((g) => (
            <CommandGroup key={g.label} heading={g.label}>
              {g.items.map((i) => (
                <CommandItem key={i.href} value={`${i.name} ${i.hint ?? ""}`} onSelect={() => go(i.href)} className="gap-3">
                  <i.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{i.name}</span>
                  {i.hint && <span className="ml-auto truncate text-xs text-muted-foreground">{i.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => { setTheme("light"); setOpen(false) }} className="gap-3"><Sun className="h-4 w-4" />Light mode</CommandItem>
            <CommandItem onSelect={() => { setTheme("dark"); setOpen(false) }} className="gap-3"><Moon className="h-4 w-4" />Dark mode</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
