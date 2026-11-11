import { Bot, BrainCircuit, LineChart } from "lucide-react"
import LoginForm from "@/components/login-form"
import { Logo } from "@/components/shell/logo"
import { ThemeToggle } from "@/components/shell/theme-toggle"

const features = [
  { icon: Bot, title: "Auto Trader", text: "A signal-driven agent that trades a demo portfolio while you watch." },
  { icon: BrainCircuit, title: "Self-learning RL agent", text: "Reinforcement learning, validated on data it has never seen." },
]

export default function Home() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-[hsl(240_45%_6%)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary/40 blur-[120px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[26rem] w-[26rem] rounded-full bg-chart-2/25 blur-[120px]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "48px 48px" }}
          aria-hidden
        />
        <div className="relative dark"><Logo href="/" /></div>
        <div className="relative max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
            <LineChart className="h-3.5 w-3.5" /> Stocks · Crypto · Automated trading
          </p>
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            A clearer view of every <span className="bg-gradient-to-r from-[hsl(286_90%_76%)] to-[hsl(160_78%_58%)] bg-clip-text text-transparent">investment</span>.
          </h1>
          <p className="mt-5 text-base text-white/65">Track your portfolio and review automated trading activity from one calm dashboard.</p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                <Icon className="mb-2 h-5 w-5 text-[hsl(286_90%_76%)]" aria-hidden />
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{text}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/40">Demo environment · Not financial advice</p>
      </section>

      {/* Form panel */}
      <section className="bg-aurora relative flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Logo href="/" className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-muted-foreground">By continuing you agree this is a demo and not financial advice.</p>
      </section>
    </div>
  )
}
