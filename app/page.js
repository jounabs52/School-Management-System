'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user')
    if (user) {
      window.location.href = '/dashboard'
    } else {
      window.location.href = '/login'
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-2xl font-bold text-gray-600">Redirecting...</div>
    </div>
  )
}
