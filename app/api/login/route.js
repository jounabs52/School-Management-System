// app/api/login/route.js   ← Make sure the file name is .js

const users = [
  { id: 1, email: 'admin@gmail.com', password: 'admin123', role: 'admin', name: 'Admin User' }
]

export async function POST(request) {
  const { email, password } = await request.json()

  const user = users.find(u => u.email === email && u.password === password)

  if (user) {
    const { password: _, ...safeUser } = user
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