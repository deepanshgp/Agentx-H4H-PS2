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
      <main className="flex-1 container mx-auto py-6 px-4">{children}</main>
    </div>
  )
}

