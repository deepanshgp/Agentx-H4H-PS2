import {
  Bitcoin,
  Bot,
  BrainCircuit,
  LayoutDashboard,
  LineChart,
  Scale,
  Swords,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  hint?: string
  badge?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Portfolio", href: "/dashboard", icon: LayoutDashboard, hint: "Net worth, allocation, activity" },
    ],
  },
  {
    label: "Markets",
    items: [
      { name: "Stocks", href: "/dashboard/stocks", icon: LineChart, hint: "NSE / BSE equities" },
      { name: "Crypto", href: "/dashboard/crypto", icon: Bitcoin, hint: "Live crypto prices & trading" },
    ],
  },
  {
    label: "Automation",
    items: [
      { name: "Auto Trader", href: "/dashboard/auto-trader", icon: Bot, hint: "Rule-based trading agent" },
      { name: "RL Agent", href: "/dashboard/rl-agent", icon: BrainCircuit, hint: "Self-learning PPO agent", badge: "Beta" },
      { name: "Debate", href: "/dashboard/debate", icon: Scale, hint: "Compare agent market views" },
      { name: "Arena", href: "/dashboard/arena", icon: Swords, hint: "Run agents head to head" },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

export const MOBILE_TABS = ["Portfolio", "Stocks", "Crypto", "Auto Trader"]

export function isNavActive(item: NavItem, pathname: string, _hash: string): boolean {
  if (item.href === "/dashboard") return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + "/")
}

export function findActive(pathname: string, hash: string) {
  return ALL_NAV_ITEMS.find((item) => isNavActive(item, pathname, hash))
}
