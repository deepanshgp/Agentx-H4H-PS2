"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginForm() {
  const [aadhaar, setAadhaar] = useState("")
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleGenerateOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (aadhaar.length === 12) {
      setShowOtp(true)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      router.push("/dashboard")
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="aadhaar">Aadhaar Card Number</Label>
        <Input
          id="aadhaar"
          placeholder="Enter 12-digit Aadhaar number"
          value={aadhaar}
          onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
          className="w-full"
        />
      </div>

      {!showOtp ? (
        <Button onClick={handleGenerateOtp} className="w-full" disabled={aadhaar.length !== 12}>
          Generate OTP
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full"
            />
          </div>
          <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </div>
      )}
    </div>
  )
}

