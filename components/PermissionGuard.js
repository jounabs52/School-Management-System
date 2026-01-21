'use client'

import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { getUserPermissions } from '@/lib/permissions'

/**
 * PermissionGuard Component
 * Wraps content and shows a blurred overlay if user doesn't have the required permission
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The content to protect
 * @param {string} props.permissionKey - The permission key to check (e.g., 'dashboard_view_stats')
 * @param {Object} props.currentUser - The current user object with id and school_id
 * @param {string} props.pageName - Display name of the page (e.g., "Dashboard", "Students")
 * @param {Function} props.renderRestricted - Optional custom render function for restricted view
 */
export default function PermissionGuard({ children, permissionKey, currentUser, pageName = 'Page', renderRestricted }) {
  const [hasAccess, setHasAccess] = useState(null) // null = loading, true = has access, false = no access
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkPermission() {
      // If currentUser is null, keep loading - user data is still being fetched
      if (currentUser === null) {
        setLoading(true)
        return
      }

      // If currentUser exists but is missing required fields, deny access
      if (!currentUser?.id || !currentUser?.school_id) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      // Admin or owner always has access
      // Check various role formats: 'admin', 'Admin', 'owner', 'Owner', 'school_admin', 'school_owner'
      // Case-insensitive check
      const role = currentUser.role?.toLowerCase().trim() || ''
      if (role === 'admin' || role === 'owner' || role === 'school_admin' || role === 'school_owner') {
        console.log('✅ PermissionGuard: Admin/Owner access granted for role:', currentUser.role)
        setHasAccess(true)
        setLoading(false)
        return
      }

      // Check staff permissions
      const permissions = await getUserPermissions(currentUser.id, currentUser.school_id)

      if (!permissions) {
        setHasAccess(false)
        setLoading(false)
        return
      }

      // Check if user has the required permission
      const hasRequiredPermission = permissions[permissionKey] === true
      setHasAccess(hasRequiredPermission)
      setLoading(false)
    }

    checkPermission()
  }, [currentUser, permissionKey])

  // Prevent body scroll when access is denied
  useEffect(() => {
    if (hasAccess === false) {
      // Disable scrolling on body
      document.body.style.overflow = 'hidden'
      return () => {
        // Re-enable scrolling when component unmounts or access is granted
        document.body.style.overflow = 'unset'
      }
    }
  }, [hasAccess])

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // If user has access, show the content normally
  if (hasAccess) {
    return <>{children}</>
  }

  // If user doesn't have access, show blurred content with Access Denied card
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Blurred Content */}
      <div className="absolute inset-0 pointer-events-none select-none blur-xl opacity-30 overflow-hidden">
        {children}
      </div>

      {/* Access Denied Card Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[9999] pl-32">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Access Denied
          </h2>

          <p className="text-gray-600 mb-6">
            You don't have permission to access <span className="font-semibold text-gray-900">{pageName}</span>.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Please contact your administrator to request access to this page.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
