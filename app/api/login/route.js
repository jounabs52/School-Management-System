// app/api/login/route.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // Query the users table to find matching user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, school_id, username, email, role, staff_id, status, last_login')
      .eq('email', email)
      .eq('password', password)
      .eq('status', 'active')
      .single()

    if (error || !user) {
      return new Response(JSON.stringify({ message: 'Invalid email or password' }), {
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
