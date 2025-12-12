// components/Header.js
'use client'

import { Bell, Menu, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Header({ user, setSidebarOpen }) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  // Beautiful date like your screenshot
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Date in center - just like screenshot */}
        <div className="hidden md:block text-center">
          <p className="text-lg font-semibold text-gray-800">{today}</p>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <button className="relative p-2 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="hidden md:block">
              <p className="font-medium text-sm">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-gray-500">admin</p>
            </div>
          </div>

          <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg text-red-600">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}