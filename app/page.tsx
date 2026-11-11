import LoginForm from "@/components/login-form"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-white p-7 shadow-sm sm:p-9">
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">EzFunds</p>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Your investments, in one place</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to view and manage your portfolio</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}

