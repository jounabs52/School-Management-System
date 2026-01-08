'use client'

import { useEffect, useState } from 'react'
import { getUserFromCookie } from '@/lib/clientAuth'

export default function DebugAuth() {
  const [authInfo, setAuthInfo] = useState(null)

  useEffect(() => {
    // Get user from cookie/localStorage
    const user = getUserFromCookie()

    // Get localStorage data
    const localStorageUser = typeof window !== 'undefined'
      ? localStorage.getItem('user')
      : null

    // Get all cookies
    const cookies = typeof document !== 'undefined'
      ? document.cookie
      : ''

    setAuthInfo({
      userFromFunction: user,
      localStorageRaw: localStorageUser,
      localStorageParsed: localStorageUser ? JSON.parse(localStorageUser) : null,
      allCookies: cookies,
      hasSchoolId: !!user?.school_id,
      schoolId: user?.school_id
    })

    console.log('🔍 DEBUG AUTH INFO:', {
      userFromFunction: user,
      localStorageRaw: localStorageUser,
      hasSchoolId: !!user?.school_id,
      schoolId: user?.school_id
    })
  }, [])

  if (!authInfo) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-red-500 rounded-lg p-4 shadow-xl max-w-md z-50">
      <h3 className="font-bold text-red-600 mb-2">🔍 Auth Debug Info</h3>
      <div className="text-xs space-y-2">
        <div>
          <strong>User Found:</strong> {authInfo.userFromFunction ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Has school_id:</strong> {authInfo.hasSchoolId ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>School ID:</strong> {authInfo.schoolId || 'N/A'}
        </div>
        <div>
          <strong>LocalStorage 'user' exists:</strong> {authInfo.localStorageRaw ? '✅ Yes' : '❌ No'}
        </div>
        {authInfo.localStorageParsed && (
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <strong>User Object:</strong>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(authInfo.localStorageParsed, null, 2)}
            </pre>
          </div>
        )}
      </div>
      <button
        onClick={() => {
          const elem = document.querySelector('[data-debug-auth]')
          if (elem) elem.style.display = 'none'
        }}
        className="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
      >
        Close
      </button>
    </div>
  )
}
