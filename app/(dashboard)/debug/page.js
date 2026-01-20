'use client'

import { useState, useEffect } from 'react'
import { getUserFromCookie } from '@/lib/clientAuth'
import { supabase } from '@/lib/supabase'
import PermissionGuard from '@/components/PermissionGuard'

function DebugPageContent() {
  const [user, setUser] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const userData = getUserFromCookie()
    setUser(userData)
    console.log('User from localStorage:', userData)
  }, [])

  const testSupabaseConnection = async () => {
    setLoading(true)
    setTestResult(null)

    try {
      // Check if Supabase is initialized
      if (!supabase) {
        setTestResult({
          error: 'Supabase client not initialized. Check environment variables.',
          details: 'Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
        })
        setLoading(false)
        return
      }

      const user = getUserFromCookie()

      if (!user) {
        setTestResult({ error: 'No user found in localStorage. Please login.' })
        setLoading(false)
        return
      }

      console.log('Testing with user:', user)

      // Test classes query
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('status', 'active')

      if (classError) {
        setTestResult({
          error: 'Classes query failed',
          details: classError,
          user: user
        })
      } else {
        setTestResult({
          success: true,
          classCount: classes?.length || 0,
          classes: classes,
          user: user
        })
      }
    } catch (error) {
      setTestResult({ error: 'Exception occurred', details: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Debug Information</h1>

        {/* User Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">User Data from localStorage</h2>
          {user ? (
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          ) : (
            <div className="text-red-600 font-semibold">
              ❌ No user found in localStorage. Please login first.
            </div>
          )}
        </div>

        {/* Test Button */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Test Supabase Connection</h2>
          <button
            onClick={testSupabaseConnection}
            disabled={loading || !user}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Test Results</h2>
            {testResult.success ? (
              <div>
                <div className="text-green-600 font-semibold mb-4">
                  ✅ Connection successful!
                </div>
                <div className="mb-2">
                  <strong>Classes found:</strong> {testResult.classCount}
                </div>
                <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <div className="text-red-600 font-semibold mb-4">
                  ❌ {testResult.error}
                </div>
                <pre className="bg-red-50 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Environment Check */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Environment Variables</h2>
          <div className="space-y-2">
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}
            </div>
            <div>
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DebugPage() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = getUserFromCookie()
    setCurrentUser(user)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <PermissionGuard
      currentUser={currentUser}
      permissionKey="debug_view"
      pageName="Debug"
    >
      <DebugPageContent />
    </PermissionGuard>
  )
}
