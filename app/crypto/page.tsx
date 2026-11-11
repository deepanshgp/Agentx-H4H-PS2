"use client"

import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function CryptoPage() {
  useEffect(() => {
    redirect("/dashboard/crypto")
  }, [])

  return null
}

