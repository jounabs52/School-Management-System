// components/Header.js
'use client'

import { Bell, Menu, LogOut, User, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'

export default function Header({ user, setSidebarOpen }) {
  const router = useRouter()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const handleLogout = async () => {
    try {
      // Clear all localStorage
      localStorage.clear()

      // Clear cookies
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'user-data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

      // Try to call logout API
      try {
        await fetch('/api/logout', { method: 'POST' })
      } catch (apiError) {
        console.log('Logout API not available, proceeding with client-side logout')
      }

      // Use window.location.href for hard redirect (ensures clean state)
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      // Force redirect anyway
      window.location.href = '/login'
    }
  }

  // Beautiful date like your screenshot
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Get user display name - prioritize username, fallback to email
  const displayName = user?.username || user?.name || user?.email?.split('@')[0] || 'User'

  // Get user role and format it nicely
  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'

  // Determine avatar source: staff photo > school logo > initials
  const avatarUrl = user?.photo_url || user?.school_logo || null
  const avatarInitial = displayName?.[0]?.toUpperCase() || 'U'

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

          {/* User Profile Section with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              {/* Avatar - Show uploaded image or gradient with initials */}
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold overflow-hidden relative">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.target.style.display = 'none'
                    }}
                  />
                ) : null}
                {!avatarUrl && <span>{avatarInitial}</span>}
              </div>

              {/* User Name and Role */}
              <div className="hidden md:block text-left">
                <p className="font-medium text-sm text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">{userRole}</p>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-medium text-sm text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">{user?.email || 'No email'}</p>
                  <p className="text-xs text-indigo-600 mt-1">{userRole}</p>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay to close dropdown when clicking outside */}
      {showProfileDropdown && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowProfileDropdown(false)}
        />
      )}
    </header>
  )
}