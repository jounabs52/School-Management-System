// app/layout.js
import './globals.css'

export const metadata = {
  title: 'Gynecology Clinic - Admin Portal',
  description: 'Professional Gynecology Clinic Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.svg" />
      </head>
      <body>{children}</body>
    </html>
  )
}
