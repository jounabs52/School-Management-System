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

    // Fetch staff photo if user has staff_id
    if (user.staff_id) {
      const { data: staff } = await supabase
        .from('staff')
        .select('photo_url')
        .eq('id', user.staff_id)
        .single()

      if (staff?.photo_url) {
        user.photo_url = staff.photo_url
      }
    }

    // Fetch school logo
    if (user.school_id) {
      const { data: school } = await supabase
        .from('schools')
        .select('logo_url')
        .eq('id', user.school_id)
        .single()

      if (school?.logo_url) {
        user.school_logo = school.logo_url
      }
    }

    // If user doesn't have school_id, fetch the first available school
    if (!user.school_id) {
      const { data: schools, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .limit(1)
        .single()

      if (!schoolError && schools) {
        user.school_id = schools.id

        // Update user's school_id in database
        await supabase
          .from('users')
          .update({ school_id: schools.id })
          .eq('id', user.id)
      } else {
        return new Response(JSON.stringify({
          message: 'No school found. Please contact administrator.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Check if school has an active session, create one if not
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('school_id', user.school_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!existingSession) {
      // Automatically create an active session for this school
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1

      await supabase
        .from('sessions')
        .insert({
          school_id: user.school_id,
          user_id: user.id,
          name: `${currentYear}-${nextYear}`,
          start_date: `${currentYear}-01-01`,
          end_date: `${nextYear}-12-31`,
          status: 'active',
          is_current: true,
          created_by: user.id
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
