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
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
        <div className="absolute top-32 right-8 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-40 animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl mb-4">
            <School className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-1">
            SmartSchool Pro
          </h1>
          <p className="text-lg text-gray-600 font-medium">School Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-gray-100">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800">Welcome Back! 👋</h2>
            <p className="text-gray-600 text-sm mt-1">Log in to manage your school efficiently</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-indigo-500" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all outline-none text-gray-800 placeholder-gray-400"
                  placeholder="admin@gmail.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-indigo-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all outline-none text-gray-800 placeholder-gray-400"
                  placeholder="••••••••••••"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 transition"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
                <span className="ml-2 text-gray-700">Remember me</span>
              </label>
              <a href="#" className="text-indigo-600 hover:text-indigo-800 font-medium transition">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-800 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Login to Dashboard
                </>
              )}
            </button>
          </form>

          {/* Login Info */}
          <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
            <p className="font-semibold text-gray-800 mb-1.5">Login with your school credentials</p>
            <p className="text-gray-500">Contact your administrator if you forgot your password</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} SmartSchool Pro • All Rights Reserved</p>
        </div>
      </div>
    </div>
  )
}