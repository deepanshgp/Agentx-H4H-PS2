/** Presentation-only formatters. Safe on NaN / null / undefined. */

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })

export function formatINR(value: number | null | undefined, opts: { compact?: boolean; decimals?: number } = {}) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  const { compact = false, decimals } = opts

  if (compact) {
    const abs = Math.abs(n)
    const sign = n < 0 ? "-" : ""
    if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
    if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`
    if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`
  }

  if (decimals !== undefined) {
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  }

  return `₹${inr.format(n)}`
}

export function formatPct(value: number | null | undefined, decimals = 2, withSign = true) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0
  const sign = withSign && n > 0 ? "+" : ""
  return `${sign}${n.toFixed(decimals)}%`
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return "Working late"
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}
