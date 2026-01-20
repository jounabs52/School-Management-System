// app/layout.js
import './globals.css'

export const metadata = {
  title: 'School Management System',
  description: 'Professional School Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.svg" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
