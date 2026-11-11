import type React from "react"
import type { Metadata } from "next"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { Topbar } from "@/components/shell/topbar"
import { MobileTabBar } from "@/components/shell/mobile-nav"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track all your investment assets in one place",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <AppSidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar />
        <main id="main" className="bg-aurora flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-up space-y-6">{children}</div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  )
}
