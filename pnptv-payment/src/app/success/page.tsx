import Link from 'next/link'

export default function Success() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Payment Successful!</h1>
        <p className="mb-8">
          Thank you for your payment. Your subscription has been activated.
        </p>
        <Link 
          href="/"
          className="text-blue-500 hover:text-blue-700"
        >
          Return to Home
        </Link>
      </div>
    </main>
  )
}