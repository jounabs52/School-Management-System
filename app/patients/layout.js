// app/patients/layout.js
'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { supabase } from '@/lib/supabase'

export default function PatientsLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState({
    name: 'Loading...',
    email: 'loading@clinic.com',
    role: 'User'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
    
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
  }, [])

  const fetchUserData = async () => {
    try {
      // Get current user from Supabase Auth
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) throw authError
      
      if (authUser) {
        // Fetch user profile data from your users table (if you have one)
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', authUser.id)
          .single()

        if (!profileError && profileData) {
          setUser({
            name: profileData.name || authUser.email.split('@')[0],
            email: authUser.email,
            role: profileData.role || 'User'
          })
        } else {
          // Fallback to auth user data
          setUser({
            name: authUser.user_metadata?.name || authUser.email.split('@')[0],
            email: authUser.email,
            role: authUser.user_metadata?.role || 'User'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      setUser({
        name: 'Guest',
        email: 'guest@clinic.com',
        role: 'Guest'
      })
    } finally {
      setLoading(false)
    }
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

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} isMobile={isMobile} />
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${
        isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-20')
      }`}>
        {/* Header */}
        <Header 
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
        />
        
        {/* Page Content */}
        <main className="p-3 sm:p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
