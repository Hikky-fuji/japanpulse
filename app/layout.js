import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  title: 'Japan Macro Dashboard',
  description: 'Japan macroeconomic indicators dashboard powered by e-Stat and Bank of Japan API',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-512.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
