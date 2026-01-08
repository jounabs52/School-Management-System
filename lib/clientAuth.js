// Utility to get user info - tries localStorage first (since cookies are HttpOnly)
export function getUserFromCookie() {
  if (typeof window === 'undefined') return null

  try {
    // Try localStorage first (this is where the login page stores it)
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }

    // Fallback: try reading from non-HttpOnly cookies (if they exist)
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';')
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))

      if (authCookie) {
        const cookieValue = authCookie.split('=').slice(1).join('=')
        const decoded = decodeURIComponent(cookieValue)
        return JSON.parse(decoded)
      }
    }

    return null
  } catch (error) {
    console.error('Error getting user auth data:', error)
    return null
  }
}

// Helper function to get school_id from user object (handles different property names)
export function getSchoolId(user) {
  if (!user) return null

  // Try different possible property names
  return user.school_id ||
         user.schoolId ||
         user.school?.id ||
         user.school_id_value ||
         null
}

// Alias for clarity
export const getUserFromStorage = getUserFromCookie
