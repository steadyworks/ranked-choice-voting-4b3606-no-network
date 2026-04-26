import './globals.css'

export const metadata = {
  title: 'Ranked Choice Voting',
  description: 'Instant Runoff Voting Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
