import LoginForm from "@/components/login-form"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Investment Dashboard</h1>
          <p className="mt-2 text-gray-600">Track all your investments in one place</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

