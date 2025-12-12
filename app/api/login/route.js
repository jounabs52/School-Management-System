// app/api/login/route.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create client with explicit schema
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
})

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

    // Create response with cookie
    const response = new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

    // Set auth-token cookie for middleware authentication (HttpOnly for security)
    response.headers.append(
      'Set-Cookie',
      `auth-token=${encodeURIComponent(JSON.stringify(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    )

    // Set user-data cookie for client-side access (NOT HttpOnly)
    response.headers.append(
      'Set-Cookie',
      `user-data=${encodeURIComponent(JSON.stringify(user))}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    )

    return response
  } catch (err) {
    console.error('Login error:', err)
    return new Response(JSON.stringify({ message: 'Server error. Please try again.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
