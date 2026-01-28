'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Eye, EyeOff, School, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if already logged in
  useEffect(() => {
    const user = localStorage.getItem('user')
    // Verify user data is valid JSON
    if (user) {
      try {
        JSON.parse(user)
        router.push('/dashboard')
      } catch (error) {
        // Invalid user data, clear it
        localStorage.removeItem('user')
      }
    }
  }, [router])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        // Validate user data has required fields
        if (!data.user || !data.user.school_id) {
          setError('Login successful but user data is incomplete. Please contact administrator.')
          return
        }

        // Save user data to localStorage for session persistence
        localStorage.setItem('user', JSON.stringify(data.user))
        // Use hard redirect to ensure localStorage is read on dashboard
        window.location.href = '/dashboard'
      } else {
        setError(data.message || 'Invalid email or password')
      }
    } catch (err) {
      setError('Something went wrong. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    handleSubmit()
  }

  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 sm:w-48 md:w-64 lg:w-80 h-32 sm:h-48 md:h-64 lg:h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
        <div className="absolute top-32 right-8 w-40 sm:w-56 md:w-72 lg:w-96 h-40 sm:h-56 md:h-72 lg:h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-10 left-1/3 w-28 sm:w-44 md:w-56 lg:w-72 h-28 sm:h-44 md:h-56 lg:h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-[95%] sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
        {/* Logo & Header */}
        <div className="text-center mb-4 sm:mb-5 md:mb-6 lg:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl mb-2 sm:mb-3 md:mb-4">
            <School className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-800 mb-1">
            Smart School Pro
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 font-medium">School Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-lg rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl p-3 sm:p-4 md:p-6 lg:p-8 border border-gray-100">
          <div className="mb-3 sm:mb-4 md:mb-6 text-center">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800">Welcome Back!</h2>
            <p className="text-gray-600 text-[10px] sm:text-xs md:text-sm lg:text-base mt-1">Log in to manage your school efficiently</p>
          </div>

          {error && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg sm:rounded-xl text-xs sm:text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-3 sm:space-y-4 md:space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 md:mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 md:pl-4 flex items-center pointer-events-none">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-indigo-500" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-8 sm:pl-9 md:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 md:py-3 lg:py-3.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all outline-none text-gray-800 placeholder-gray-400 text-xs sm:text-sm md:text-base"
                  placeholder="admin@gmail.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 mb-1 sm:mb-1.5 md:mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 md:pl-4 flex items-center pointer-events-none">
                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-indigo-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-8 sm:pl-9 md:pl-11 pr-9 sm:pr-10 md:pr-12 py-2 sm:py-2.5 md:py-3 lg:py-3.5 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all outline-none text-gray-800 placeholder-gray-400 text-xs sm:text-sm md:text-base"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 sm:pr-3 md:pr-4 flex items-center text-gray-500 hover:text-indigo-600 transition"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-2.5 sm:py-3 md:py-3.5 lg:py-4 rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-800 transform hover:scale-[1.02] transition-all duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  <span>Login to Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Login Info */}
          <div className="mt-3 sm:mt-4 md:mt-5 p-2 sm:p-2.5 md:p-3 lg:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200 text-[10px] sm:text-xs md:text-sm text-gray-600">
            <p className="font-semibold text-gray-800 mb-1 sm:mb-1.5">Login with your school credentials</p>
            <p className="text-gray-500">Contact your administrator if you forgot your password</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-2 sm:mt-3 md:mt-4 text-[9px] sm:text-[10px] md:text-xs text-gray-600">
          <p>© {new Date().getFullYear()} Smart School Pro</p>
        </div>
      </div>
    </div>
  )
}
