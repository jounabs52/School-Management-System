// app/dashboard/page.js
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const JWT_SECRET = process.env.JWT_SECRET;

export default function DashboardPage() {
  const token = cookies().get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    verify(token, JWT_SECRET);
  } catch (err) {
    redirect('/login');
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">Welcome to Dashboard</h1>
      <p className="text-gray-600">You are logged in securely.</p>
      <button
        onClick={async () => {
          await fetch('/api/logout', { method: 'POST' });
          window.location.href = '/login';
        }}
        className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg"
      >
        Logout
      </button>
    </main>
  );
}