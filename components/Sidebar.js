// components/Sidebar.js
'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  BarChart3, 
  Settings,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  Edit3,
  Plus,
  X,
  LogOut
} from 'lucide-react'

export default function Sidebar({ isOpen, setIsOpen, isMobile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [patientsExpanded, setPatientsExpanded] = useState(false)
  const [invoiceExpanded, setInvoiceExpanded] = useState(false) // ← NEW

  // Auto-hide dropdowns when leaving route
  useEffect(() => {
    if (!pathname.startsWith('/patients')) setPatientsExpanded(false)
    if (!pathname.startsWith('/invoice')) setInvoiceExpanded(false) // ← NEW
  }, [pathname])

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Patients', icon: Users, path: '/patients' },
    { name: 'Doctors', icon: Users, path: '/doctors/list' },
    { name: 'Appointments', icon: Calendar, path: '/appointments' },
    { name: 'Treatment Plain', icon: Calendar, path: '/treatment-plain' },
    { name: 'Invoice', icon: ClipboardList, path: '/invoice' }, // ← Will be dropdown
    { name: 'Reports', icon: BarChart3, path: '/reports' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ]

  const handleNavigation = (path) => {
    router.push(path)
    if (isMobile) setIsOpen(false)
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push('/login')
  }

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-white shadow-xl transition-all duration-300 z-40 ${
        isMobile 
          ? (isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64')
          : (isOpen ? 'w-64' : 'w-20')
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Heart className="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="white" />
          </div>
          {(isOpen || isMobile) && (
            <div className="animate-fade-in">
              <h1 className="text-base sm:text-lg font-bold text-gray-800">Gynecology</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          )}
        </div>
        {isMobile && isOpen && (
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Desktop Toggle */}
      {!isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 shadow-md"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
        </button>
      )}

      {/* Menu */}
      <nav className="p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {menuItems.map((item, index) => {
          const isActive = pathname === item.path || 
            (item.name === 'Doctors' && pathname.startsWith('/doctors')) ||
            (item.name === 'Invoice' && pathname.startsWith('/invoice')) // ← NEW

          const Icon = item.icon

          // Patients Dropdown
          if (item.name === 'Patients') {
            return (
              <div key={item.path} style={{ animationDelay: `${index * 50}ms` }}>
                <button
                  onClick={() => {
                    if (isOpen || isMobile) {
                      setPatientsExpanded(!patientsExpanded)
                    } else {
                      setIsOpen(true)
                      setPatientsExpanded(true)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    pathname.startsWith('/patients')
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${pathname.startsWith('/patients') ? 'text-white' : 'text-gray-600'}`} />
                  {(isOpen || isMobile) && (
                    <>
                      <span className="flex-1 text-left font-medium text-sm sm:text-base">{item.name}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${
                          patientsExpanded ? 'rotate-180' : ''
                        } ${pathname.startsWith('/patients') ? 'text-white' : 'text-gray-600'}`}
                      />
                    </>
                  )}
                </button>

                {(isOpen || isMobile) && patientsExpanded && (
                  <div className="mt-1 space-y-1">
                    <button
                      onClick={() => handleNavigation('/patients/list')}
                      className={`w-full flex items-center gap-2 px-3 py-2 ml-5 rounded-lg text-sm transition-all ${
                        pathname === '/patients/list'
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span>Patient List</span>
                    </button>
                    <button
                      onClick={() => handleNavigation('/patients/form-designer')}
                      className={`w-full flex items-center gap-2 px-3 py-2 ml-5 rounded-lg text-sm transition-all ${
                        pathname === '/patients/form-designer'
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Form Designer</span>
                    </button>
                  </div>
                )}
              </div>
            )
          }

          // Invoice Dropdown ← NEW
          if (item.name === 'Invoice') {
            return (
              <div key={item.path} style={{ animationDelay: `${index * 50}ms` }}>
                <button
                  onClick={() => {
                    if (isOpen || isMobile) {
                      setInvoiceExpanded(!invoiceExpanded)
                    } else {
                      setIsOpen(true)
                      setInvoiceExpanded(true)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    pathname.startsWith('/invoice')
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${pathname.startsWith('/invoice') ? 'text-white' : 'text-gray-600'}`} />
                  {(isOpen || isMobile) && (
                    <>
                      <span className="flex-1 text-left font-medium text-sm sm:text-base">{item.name}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${
                          invoiceExpanded ? 'rotate-180' : ''
                        } ${pathname.startsWith('/invoice') ? 'text-white' : 'text-gray-600'}`}
                      />
                    </>
                  )}
                </button>

                {(isOpen || isMobile) && invoiceExpanded && (
                  <div className="mt-1 space-y-1">
                    <button
                      onClick={() => handleNavigation('/invoice')}
                      className={`w-full flex items-center gap-2 px-3 py-2 ml-5 rounded-lg text-sm transition-all ${
                        pathname === '/invoice'
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span>Invoice List</span>
                    </button>
                    <button
                      onClick={() => handleNavigation('/invoice/create')}
                      className={`w-full flex items-center gap-2 px-3 py-2 ml-5 rounded-lg text-sm transition-all ${
                        pathname === '/invoice/create'
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Invoice</span>
                    </button>
                  </div>
                )}
              </div>
            )
          }

          // Other Menu Items
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-600'}`} />
              {(isOpen || isMobile) && (
                <span className="font-medium text-sm sm:text-base">{item.name}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-gray-50">
        {(isOpen || isMobile) ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-600 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 transition-all duration-200"
          >
            <div className="p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
              <LogOut className="w-4 h-4 text-red-600" />
            </div>
            <span className="font-semibold">Logout</span>
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full p-3 flex justify-center text-red-600 hover:bg-red-50 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  )
}