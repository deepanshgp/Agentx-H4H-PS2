import {
  Bitcoin,
  Bot,
  BookOpen,
  BrainCircuit,
  CandlestickChart,
  LayoutDashboard,
  LineChart,
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
      { name: "Charts", href: "/dashboard/charts", icon: CandlestickChart, hint: "Candlesticks & live charts" },
    ],
  },
  {
    label: "Automation",
    items: [
      { name: "Auto Trader", href: "/dashboard/auto-trader", icon: Bot, hint: "Rule-based trading agent" },
      { name: "RL Agent", href: "/dashboard/rl-agent", icon: BrainCircuit, hint: "Self-learning PPO agent", badge: "Beta" },
      { name: "Journal", href: "/dashboard/journal", icon: BookOpen, hint: "Review every trade" },
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
