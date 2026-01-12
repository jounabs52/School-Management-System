// lib/supabaseClient.js
// Centralized Supabase client with user_id helper functions

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create standard Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

/**
 * Get current logged-in user from localStorage
 * @returns {Object|null} User object or null
 */
export function getCurrentUser() {
  if (typeof window === 'undefined') return null

  try {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    return JSON.parse(userStr)
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get current user's ID
 * @returns {string|null} User ID or null
 */
export function getCurrentUserId() {
  const user = getCurrentUser()
  return user?.id || null
}

/**
 * Get current user's school ID
 * @returns {string|null} School ID or null
 */
export function getCurrentSchoolId() {
  const user = getCurrentUser()
  return user?.school_id || null
}

/**
 * Insert data with automatic user_id
 * @param {string} table - Table name
 * @param {Object|Array} data - Data to insert (object or array of objects)
 * @returns {Promise} Supabase query result
 */
export async function insertWithUserId(table, data) {
  const userId = getCurrentUserId()

  if (!userId) {
    throw new Error('No user logged in. Please login first.')
  }

  // Handle both single object and array of objects
  const dataArray = Array.isArray(data) ? data : [data]

  // Add user_id to each item
  const dataWithUserId = dataArray.map(item => ({
    ...item,
    user_id: userId
  }))

  return supabase
    .from(table)
    .insert(dataWithUserId)
    .select()
}

/**
 * Select data filtered by current user
 * @param {string} table - Table name
 * @returns {Object} Supabase query builder with user filter applied
 */
export function selectForCurrentUser(table) {
  const userId = getCurrentUserId()

  if (!userId) {
    throw new Error('No user logged in. Please login first.')
  }

  return supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
}

/**
 * Update data for current user only
 * @param {string} table - Table name
 * @param {Object} data - Data to update
 * @returns {Object} Supabase query builder with user filter applied
 */
export function updateForCurrentUser(table, data) {
  const userId = getCurrentUserId()

  if (!userId) {
    throw new Error('No user logged in. Please login first.')
  }

  return supabase
    .from(table)
    .update(data)
    .eq('user_id', userId)
}

/**
 * Delete data for current user only
 * @param {string} table - Table name
 * @returns {Object} Supabase query builder with user filter applied
 */
export function deleteForCurrentUser(table) {
  const userId = getCurrentUserId()

  if (!userId) {
    throw new Error('No user logged in. Please login first.')
  }

  return supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
}

export default supabase
