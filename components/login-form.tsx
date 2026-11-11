"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { cn } from "@/lib/utils"

const RESEND_SECONDS = 30

/** "123456789012" -> "1234 5678 9012" (display only; state keeps raw digits) */
const groupAadhaar = (d: string) => d.replace(/(\d{4})(?=\d)/g, "$1 ")

export default function LoginForm() {
  const [aadhaar, setAadhaar] = useState("")
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const handleGenerateOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (aadhaar.length === 12) {
      setShowOtp(true)
      setCooldown(RESEND_SECONDS)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) return
    setIsLoading(true)
    // Simulate API call (unchanged behaviour)
    setTimeout(() => {
      setIsLoading(false)
      router.push("/dashboard")
    }, 1000)
  }

  return (
    <div className="animate-fade-up">
      {/* step indicator */}
      <ol className="mb-8 flex items-center gap-2" aria-label="Sign in progress">
        {["Aadhaar", "Verify OTP"].map((label, i) => {
          const active = (i === 0 && !showOtp) || (i === 1 && showOtp)
          const done = i === 0 && showOtp
          return (
            <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors", active || done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{i + 1}</span>
              <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i === 0 && <span className={cn("ml-1 h-px flex-1 transition-colors", done ? "bg-primary" : "bg-border")} aria-hidden />}
            </li>
          )
        })}
      </ol>

      <h1 className="text-2xl font-semibold tracking-tight">{showOtp ? "Enter the 6-digit code" : "Welcome back"}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {showOtp ? (
          <>We sent a one-time code for Aadhaar <span className="num font-medium text-foreground">XXXX XXXX {aadhaar.slice(-4)}</span>.</>
        ) : (
          "Sign in with your Aadhaar number to see your portfolio."
        )}
      </p>

      {!showOtp ? (
        <form onSubmit={handleGenerateOtp} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="aadhaar">Aadhaar number</Label>
            <Input
              id="aadhaar"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="0000 0000 0000"
              value={groupAadhaar(aadhaar)}
              onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
              aria-describedby="aadhaar-help"
              className="num h-12 text-lg tracking-widest"
            />
            <p id="aadhaar-help" className="flex items-center justify-between text-xs text-muted-foreground">
              <span>12 digits</span>
              <span className="num">{aadhaar.length}/12</span>
            </p>
          </div>
          <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base" disabled={aadhaar.length !== 12}>
            Generate OTP <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div className="space-y-3">
            <Label htmlFor="otp">One-time password</Label>
            <InputOTP id="otp" maxLength={6} value={otp} onChange={(v) => setOtp(v.replace(/\D/g, ""))} autoFocus inputMode="numeric" containerClassName="justify-between">
              <InputOTPGroup className="w-full justify-between gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} className="num h-14 w-full flex-1 rounded-lg border text-lg first:rounded-l-lg first:border-l last:rounded-r-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isLoading || otp.length !== 6}>
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>) : "Sign in"}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => { setShowOtp(false); setOtp("") }} className="inline-flex items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Change number
            </button>
            <button type="button" disabled={cooldown > 0} onClick={() => setCooldown(RESEND_SECONDS)} className="rounded font-medium text-brand disabled:cursor-not-allowed disabled:text-muted-foreground">
              {cooldown > 0 ? <>Resend in <span className="num">{cooldown}s</span></> : "Resend code"}
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> Demo sign-in. OTP verification is simulated.
      </p>
    </div>
  )
}
