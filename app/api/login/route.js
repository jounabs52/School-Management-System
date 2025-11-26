// app/api/login/route.js
import { createClient } from '@supabase/supabase-js'

// Create Supabase client directly in this file to ensure it works
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    console.log('=== LOGIN DEBUG ===')
    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Key exists:', !!supabaseKey)

    // First, try to get ALL users to see if connection works
    const { data: allUsersTest, error: testError } = await supabase
      .from('users')
      .select('*')

    console.log('All users in table:', allUsersTest)
    console.log('Test query error:', testError)

    // Now check for specific email
    const { data: allUsers, error: checkError } = await supabase
      .from('users')
      .select('id, email, password, status')
      .eq('email', email)

    console.log('Email entered:', email)
    console.log('Password entered:', password)
    console.log('Users found with this email:', allUsers)
    console.log('Check error:', checkError)

    // Query the users table to find matching user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, school_id, username, email, role, staff_id, status, last_login')
      .eq('email', email)
      .eq('password', password)
      .eq('status', 'active')
      .single()

    console.log('Final user match:', user)
    console.log('Final error:', error)
    console.log('===================')

    if (error || !user) {
      return new Response(JSON.stringify({
        message: 'Invalid email or password',
        debug: checkError?.message || error?.message || 'No matching user'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update last_login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Login error:', err)
    return new Response(JSON.stringify({ message: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}