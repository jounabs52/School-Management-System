// app/(dashboard)/layout.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to get user from localStorage first, then cookie
    let userData = null

    // Check localStorage
    const localStorageUser = localStorage.getItem('user')
    if (localStorageUser) {
      try {
        userData = JSON.parse(localStorageUser)
      } catch (err) {
        console.error('Error parsing localStorage user:', err)
      }
    }

    // If not in localStorage, check cookie
    if (!userData) {
      const getCookie = (name) => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop().split(';').shift()
      }

      const authToken = getCookie('auth-token')
      if (authToken) {
        try {
          userData = JSON.parse(decodeURIComponent(authToken))
        } catch (err) {
          console.error('Error parsing cookie auth token:', err)
        }
      }
    }

    // If no user found, redirect to login immediately
    if (!userData) {
      console.log('No user found, redirecting to login...')
      window.location.href = '/login'
      return
    }

    setUser(userData)
    setLoading(false)

    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-600">Loading Dashboard...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-600">Redirecting to login...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main content - no left padding on mobile, responsive padding on desktop */}
      <div className={`flex-1 flex flex-col transition-all duration-300 w-full ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-16'}`}>
        <Header user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-2 sm:p-3 lg:p-4 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}