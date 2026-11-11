"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, LogOut, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { name: "Portfolio", href: "/dashboard" },
    { name: "Stocks", href: "/dashboard/stocks" },
    { name: "Crypto", href: "/dashboard/crypto" },
    { name: "Insurance", href: "/dashboard/insurance" },
    { name: "Predictor", href: "/dashboard/predictor" },
    { name: "Auto Trader", href: "/dashboard#auto-trader" },
    { name: "Journal", href: "/dashboard#journal" },
  ]

  const handleLogout = () => {
    router.push("/")
  }

  return (
    <header className="bg-white border-b border-primary/10 sticky top-0 z-10">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-dark mr-10">EzFunds</h1>
            <nav className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    pathname === item.href 
                      ? "bg-primary/10 text-primary" 
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                <User className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm font-medium text-dark">Areion</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="text-gray-700 hover:text-secondary hover:bg-secondary/10"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
