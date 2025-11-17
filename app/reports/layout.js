// app/patients/layout.js
'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function PatientsLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Mock user data - replace with actual auth
  const user = {
    name: 'Muhammad',
    email: 'admin@clinic.com',
    role: 'Administrator'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div 
        className={`transition-all duration-300 ${
          sidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        {/* Header */}
        <Header 
          user={user} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />
        
        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}