/**
 * Secure Query Helper - Ensures all queries filter by school_id
 *
 * This provides an extra layer of protection by:
 * 1. Automatically adding school_id filter to all queries
 * 2. Validating that currentUser has proper school_id
 * 3. Logging all database access for audit trail
 */

import { supabase } from './supabase'

/**
 * Get current user's school_id from cookie
 * @returns {string|null} school_id
 */
export const getCurrentSchoolId = () => {
  try {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
    }

    const userData = getCookie('user-data')
    if (!userData) return null

    const user = JSON.parse(decodeURIComponent(userData))
    return user?.school_id || null
  } catch (error) {
    console.error('Error getting school_id:', error)
    return null
  }
}

/**
 * Secure query builder that automatically adds school_id filter
 *
 * @param {string} tableName - Name of the table to query
 * @returns {object} Query builder with school_id filter applied
 *
 * @example
 * const { data } = await secureQuery('students')
 *   .select('*')
 *   .eq('status', 'active')
 */
export const secureQuery = (tableName) => {
  const schoolId = getCurrentSchoolId()

  if (!schoolId) {
    throw new Error('No school_id found. User must be logged in.')
  }

  // Log for audit trail (optional)
  console.log(`[SecureQuery] Accessing ${tableName} for school: ${schoolId}`)

  // Return query builder with school_id filter automatically applied
  return supabase
    .from(tableName)
    .select()
    .eq('school_id', schoolId)
}

/**
 * Secure insert - Automatically adds school_id and user_id
 *
 * @param {string} tableName - Name of the table
 * @param {object} data - Data to insert (without school_id)
 * @returns {Promise} Supabase insert promise
 *
 * @example
 * await secureInsert('students', {
 *   first_name: 'John',
 *   last_name: 'Doe'
 * })
 */
export const secureInsert = async (tableName, data) => {
  const schoolId = getCurrentSchoolId()

  if (!schoolId) {
    throw new Error('No school_id found. User must be logged in.')
  }

  const getCookie = (name) => {
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop().split(';').shift()
    return null
  }

  const userData = getCookie('user-data')
  const user = JSON.parse(decodeURIComponent(userData))

  // Automatically add school_id and user_id
  const secureData = {
    ...data,
    school_id: schoolId,
    user_id: user.id
  }

  console.log(`[SecureInsert] Inserting into ${tableName} for school: ${schoolId}`)

  return supabase
    .from(tableName)
    .insert(secureData)
}

/**
 * Secure update - Ensures update only affects current school's data
 *
 * @param {string} tableName - Name of the table
 * @param {string} recordId - ID of record to update
 * @param {object} data - Data to update
 * @returns {Promise} Supabase update promise
 */
export const secureUpdate = async (tableName, recordId, data) => {
  const schoolId = getCurrentSchoolId()

  if (!schoolId) {
    throw new Error('No school_id found. User must be logged in.')
  }

  console.log(`[SecureUpdate] Updating ${tableName} record ${recordId} for school: ${schoolId}`)

  return supabase
    .from(tableName)
    .update(data)
    .eq('id', recordId)
    .eq('school_id', schoolId)  // CRITICAL: Ensure we only update our school's data
}

/**
 * Secure delete - Ensures delete only affects current school's data
 *
 * @param {string} tableName - Name of the table
 * @param {string} recordId - ID of record to delete
 * @returns {Promise} Supabase delete promise
 */
export const secureDelete = async (tableName, recordId) => {
  const schoolId = getCurrentSchoolId()

  if (!schoolId) {
    throw new Error('No school_id found. User must be logged in.')
  }

  console.log(`[SecureDelete] Deleting ${tableName} record ${recordId} for school: ${schoolId}`)

  return supabase
    .from(tableName)
    .delete()
    .eq('id', recordId)
    .eq('school_id', schoolId)  // CRITICAL: Ensure we only delete our school's data
}

/**
 * Validate that user belongs to a school
 * Use this on every page load
 *
 * @returns {boolean} true if user has valid school_id
 */
export const validateSchoolAccess = () => {
  const schoolId = getCurrentSchoolId()

  if (!schoolId) {
    console.warn('[Security] No school_id found')
    // Optionally redirect to login
    // window.location.href = '/login'
    return false
  }

  return true
}
