"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const Icon = !mounted ? Sun : resolvedTheme === "dark" ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Change theme">
          <Icon className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {[
          { v: "light", label: "Light", I: Sun },
          { v: "dark", label: "Dark", I: Moon },
          { v: "system", label: "System", I: Monitor },
        ].map(({ v, label, I }) => (
          <DropdownMenuItem key={v} onClick={() => setTheme(v)} className="gap-2">
            <I className="h-4 w-4" />
            {label}
            {mounted && theme === v && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
