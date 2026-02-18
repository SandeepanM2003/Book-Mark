import type { Metadata } from 'next'
import './globals.css'

// page title 
// description that shows in the browser tab
export const metadata: Metadata = {
  title: 'Book-Mark',
  description: 'bookmark manager with real-time sync',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
