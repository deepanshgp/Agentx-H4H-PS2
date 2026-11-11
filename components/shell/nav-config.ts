import {
  LayoutDashboard, LineChart, Bitcoin, ShieldCheck, CandlestickChart,
  Sparkles, TrendingUp, BarChart3, PieChart, Bot, BrainCircuit, BookOpen,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  /** short description shown in the command palette */
  hint?: string
  badge?: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** "#auto-trader" / "#journal" are tabs inside /dashboard (see dashboard/page.tsx) */
export const HASH_TABS = ["auto-trader", "journal"] as const

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ name: "Portfolio", href: "/dashboard", icon: LayoutDashboard, hint: "Net worth, allocation, activity" }],
  },
  {
    label: "Markets",
    items: [
      { name: "Stocks", href: "/dashboard/stocks", icon: LineChart, hint: "NSE / BSE equities" },
      { name: "Crypto", href: "/dashboard/crypto", icon: Bitcoin, hint: "Live crypto prices & trading" },
      { name: "Insurance", href: "/dashboard/insurance", icon: ShieldCheck, hint: "Policies & cover" },
      { name: "Charts", href: "/dashboard/charts", icon: CandlestickChart, hint: "Candlesticks & live charts" },
    ],
  },
  {
    label: "AI tools",
    items: [
      { name: "AI Advisor", href: "/dashboard/ai-advisor", icon: Sparkles, hint: "Personalised recommendations", badge: "AI" },
      { name: "Predictor", href: "/dashboard/predictor", icon: TrendingUp, hint: "Project potential returns" },
      { name: "Market Predictor", href: "/dashboard/market-predictor", icon: BarChart3, hint: "Bull or bear outlook (Gemini)", badge: "AI" },
      { name: "Optimizer", href: "/dashboard/portfolio-optimizer", icon: PieChart, hint: "Rebalance by risk profile", badge: "AI" },
    ],
  },
  {
    label: "Automation",
    items: [
      { name: "Auto Trader", href: "/dashboard#auto-trader", icon: Bot, hint: "Rule-based trading agent" },
      { name: "RL Agent", href: "/dashboard/rl-agent", icon: BrainCircuit, hint: "Self-learning PPO agent", badge: "Beta" },
      { name: "Journal", href: "/dashboard#journal", icon: BookOpen, hint: "Review every trade" },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

/** the 4 destinations pinned on the mobile tab bar (5th slot = "More") */
export const MOBILE_TABS = ["Portfolio", "Stocks", "Crypto", "AI Advisor"]

export function isNavActive(item: NavItem, pathname: string, hash: string): boolean {
  const [path, itemHash] = item.href.split("#")
  if (itemHash) return pathname === path && hash === itemHash
  if (path === "/dashboard") return pathname === "/dashboard" && !(HASH_TABS as readonly string[]).includes(hash)
  return pathname === path || pathname.startsWith(path + "/")
}

export function findActive(pathname: string, hash: string) {
  return ALL_NAV_ITEMS.find((i) => isNavActive(i, pathname, hash))
}
