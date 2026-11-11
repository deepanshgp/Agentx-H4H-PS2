import type React from "react"
import type { Metadata } from "next"
import DashboardNav from "@/components/dashboard-nav"

export const metadata: Metadata = {
  title: "EzFunds",
  description: "Track all your investment assets in one place",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  )
}

