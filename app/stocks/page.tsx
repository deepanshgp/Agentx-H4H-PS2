"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function StocksPage() {
  useEffect(() => {
    redirect("/dashboard/stocks")
  }, [])

  return null
}

