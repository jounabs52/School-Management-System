import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' }
})

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const authToken = cookieStore.get('auth-token')

    if (!authToken) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const user = JSON.parse(authToken.value)

    const { data, error } = await supabase
      .from('staff')
      .select('id, first_name, last_name, designation')
      .eq('school_id', user.school_id)
      .eq('status', 'active')
      .order('first_name', { ascending: true })

    if (error) {
      console.error('Error fetching staff:', error)
      return new Response(JSON.stringify({ message: 'Failed to fetch staff' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Staff fetch error:', err)
    return new Response(JSON.stringify({ message: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
