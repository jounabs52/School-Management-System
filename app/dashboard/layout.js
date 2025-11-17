
// app/dashboard/layout.js
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
    } else {
      setUser(JSON.parse(userData))
    }

    // Check screen size and set initial sidebar state
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [router])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overlay for mobile when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} isMobile={isMobile} />
      
      <div className={`transition-all duration-300 ${
        isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-20')
      }`}>
        <Header 
          user={user} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />
        
        <main className="p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}