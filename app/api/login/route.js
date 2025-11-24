// app/api/login/route.js

import { cookies } from 'next/headers'

const users = [
  { id: 1, email: 'admin@gmail.com', password: 'admin123', role: 'admin', name: 'Admin User' }
]

export async function POST(request) {
  const { email, password } = await request.json()

  const user = users.find(u => u.email === email && u.password === password)

  if (user) {
    const { password: _, ...safeUser } = user

    // Set auth cookie
    const cookieStore = await cookies()
    cookieStore.set('auth-token', JSON.stringify(safeUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })

    return new Response(JSON.stringify({ user: safeUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } else {
    return new Response(JSON.stringify({ message: 'Invalid email or password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}