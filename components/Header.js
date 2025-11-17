// components/Header.js
'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Menu, LogOut, User, Settings as SettingsIcon } from 'lucide-react'

export default function Header({ user, sidebarOpen, setSidebarOpen, isMobile }) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/login')
  }

  const notifications = [
    { id: 1, text: 'New appointment scheduled', time: '5 min ago', unread: true },
    { id: 2, text: 'Patient report ready', time: '1 hour ago', unread: true },
    { id: 3, text: 'System backup completed', time: '2 hours ago', unread: false },
  ]

  // Get current date and time
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 md:py-4">
        {/* Left Section - Menu Button (Mobile) and Welcome */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}
          
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 truncate">
              Welcome back, {user?.name || 'Admin'}!
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block truncate">
              {currentDate}, {currentTime}
            </p>
            <p className="text-xs text-gray-500 sm:hidden">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {currentTime}
            </p>
          </div>
        </div>

        {/* Right Section - Notifications & User */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 animate-slide-up">
                <div className="p-3 sm:p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">Notifications</h3>
                    <span className="text-xs text-purple-600 font-medium">
                      {notifications.filter(n => n.unread).length} new
                    </span>
                  </div>
                </div>
                <div className="max-h-64 sm:max-h-96 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                        notif.unread ? 'bg-purple-50' : ''
                      }`}
                    >
                      <p className="text-xs sm:text-sm text-gray-800">{notif.text}</p>
                      <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t border-gray-200">
                  <button className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm sm:text-base">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-medium text-gray-800 truncate max-w-[120px]">
                  {user?.name || 'Admin User'}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                  {user?.role || 'Administrator'}
                </p>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 animate-slide-up">
                <div className="p-4 border-b border-gray-200">
                  <p className="font-medium text-gray-800 truncate">{user?.name || 'Admin User'}</p>
                  <p className="text-sm text-gray-500 truncate">{user?.email || 'admin@clinic.com'}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm">Profile</span>
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    <span className="text-sm">Settings</span>
                  </button>
                </div>
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
