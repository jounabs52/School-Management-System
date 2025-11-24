import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()

  // Delete the auth cookie
  cookieStore.delete('auth-token')

  return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
