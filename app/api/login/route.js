import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const { email, password } = await req.json()

    // Simple credential check
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

    if (error || !user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    // Success
    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
