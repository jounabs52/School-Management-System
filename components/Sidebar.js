// components/Sidebar.jsx
'use client'

import { useState } from 'react'
import {
  LayoutDashboard, Phone, Users, UserCog, CalendarCheck, School,
  Receipt, CreditCard, Award, Bus, Library, FileText, Settings, LogOut,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState(null)

  const toggleMenu = (key) => {
    setOpenMenu(openMenu === key ? null : key)
  }

  const handleLogout = async () => {
    try {
      // Clear all localStorage
      localStorage.clear()

      // Clear cookies
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'user-data=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

      // Try to call logout API if it exists
      try {
        await fetch('/api/logout', { method: 'POST' })
      } catch (apiError) {
        console.log('Logout API not available, proceeding with client-side logout')
      }

      // Redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      // Force redirect anyway
      window.location.href = '/login'
    }
  }

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { title: "Front Desk", icon: Phone, key: "frontdesk", submenus: [
      { title: "People Directory", href: "/frontdesk/directory" },
      { title: "Visitor In/Out", href: "/frontdesk/visitors" },
      { title: "Admission Inquiry", href: "/frontdesk/inquiry" },
    ]},
    { title: "Students", icon: Users, key: "students", submenus: [
      { title: "Active Students", href: "/students/active" },
      { title: "Admission Register", href: "/students/admission" },
      { title: "Old Students", href: "/students/old" },
      { title: "Student Reports", href: "/students/reports" },
      { title: "Certificates", href: "/students/certificates" },
      { title: "ID Cards", href: "/students/cards" },
    ]},
    { title: "HR / Staff", icon: UserCog, key: "hr", submenus: [
      { title: "Active Staff", href: "/hr/active" },
      { title: "Old Staff", href: "/hr/old" },
      { title: "Certificates", href: "/hr/certificates" },
      { title: "ID Cards", href: "/hr/cards" },
      { title: "Recruitment", href: "/hr/recruitment" },
    ]},
    { title: "Attendance", icon: CalendarCheck, key: "attendance", submenus: [
      { title: "Staff Attendance", href: "/attendance/staff" },
      { title: "Student Attendance", href: "/attendance/students" },
      { title: "Reports", href: "/attendance/reports" },
    ]},
    { title: "Classes", icon: School, key: "classes", submenus: [
      { title: "Class List", href: "/classes/list" },
      { title: "Sections", href: "/classes/sections" },
      { title: "Subjects", href: "/classes/subjects" },
    ]},
    { title: "Timetable", icon: CalendarCheck, href: "/timetable" },
    { title: "Date Sheet", icon: FileText, href: "/datesheet" },
    { title: "Fee", icon: Receipt, key: "fee", submenus: [
      { title: "Collect Fee", href: "/fee/collect" },
      { title: "View Challan", href: "/fee/challans" },
      { title: "Create Challan", href: "/fee/create" },
      { title: "Fee Policy", href: "/fee/admission-fee" },
    ]},
    { title: "Payroll", icon: CreditCard, key: "payroll", submenus: [
      { title: "Create Salary", href: "/payroll/salary-structure" },
      { title: "Pay Salary", href: "/payroll/pay" },
      { title: "Salary Slips", href: "/payroll/slips" },
      { title: "Reports", href: "/payroll/reports" },
      { title: "Other Expenses", href: "/payroll/expenses" },
    ]},
    { title: "Examination", icon: Award, key: "exam", submenus: [
      { title: "Exams", href: "/exam/exams" },
      { title: "Tests", href: "/exam/test" },
      { title: "Test Marks", href: "/exam/test/marks" },
      { title: "Exam Marks", href: "/exam/marks" },
      { title: "Reports", href: "/exam/reports" },
    ]},
    { title: "Transport", icon: Bus, key: "transport", submenus: [
      { title: "Passengers", href: "/transport/passengers" },
      { title: "Vehicles", href: "/transport/vehicles" },
      { title: "Routes", href: "/transport/routes" },
    ]},
    { title: "Library", icon: Library, href: "/library" },
    { title: "Reports", icon: FileText, href: "/reports" },
    { title: "Settings", icon: Settings, href: "/settings" },
  ]

  return (
    <aside className={clsx(
      "fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-blue-900 via-blue-900 to-blue-950 text-white transition-all duration-300 flex flex-col overflow-hidden shadow-2xl",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Logo & Toggle Button */}
      <div className="flex items-center justify-between p-3 border-b border-blue-800/50 shrink-0 bg-blue-900/50">
        <div className={clsx("flex items-center gap-2", !isOpen && "justify-center w-full")}>
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
            <School className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div>
              <h1 className="text-base font-bold tracking-tight">Smart School Pro</h1>
              <p className="text-[10px] text-blue-300">Management System</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 hover:bg-blue-800 rounded-lg transition lg:block hidden"
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Scrollable Menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 sidebar-scroll">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href ? pathname === item.href : pathname.startsWith(`/${item.key || ''}`)
          const isOpenMenu = openMenu === item.key

          if (item.submenus) {
            return (
              <div key={item.key}>
                <button
                  onClick={() => toggleMenu(item.key)}
                  className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200",
                    isActive && "bg-white/15 shadow-md"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {isOpen && <span className="font-medium text-xs">{item.title}</span>}
                  </div>
                  {isOpen && <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpenMenu ? "rotate-180" : ""}`} />}
                </button>

                {isOpen && isOpenMenu && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-blue-700/50 pl-3">
                    {item.submenus.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={clsx(
                          "block px-2 py-1.5 rounded-lg text-xs hover:bg-white/10 transition-all duration-200 text-blue-100",
                          pathname === sub.href && "bg-red-600 text-white font-medium shadow-md"
                        )}
                      >
                        {sub.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200",
                isActive && "bg-white/15 shadow-md"
              )}
            >
              <Icon className="w-4 h-4" />
              {isOpen && <span className="font-medium text-xs">{item.title}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout – Always Visible */}
      <div className="p-2 border-t border-blue-800/50 shrink-0 bg-blue-950/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600 transition-all duration-200 text-red-200 hover:text-white"
        >
          <LogOut className="w-4 h-4" />
          {isOpen && <span className="font-medium text-xs">Logout</span>}
        </button>
      </div>
    </aside>
  )
}