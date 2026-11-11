import { Logo } from "./logo"
import { NavList } from "./nav-list"

/** Desktop sidebar (≥ lg). Fixed, scrolls independently. */
export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-5">
        <NavList />
      </div>
      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/15 to-chart-4/10 p-3">
          <p className="text-xs font-semibold">Demo portfolio</p>
          <p className="mt-0.5 text-xs text-muted-foreground">AI agents place simulated trades. Signals are not financial advice.</p>
        </div>
      </div>
    </aside>
  )
}
