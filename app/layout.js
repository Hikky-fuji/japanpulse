import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  title: 'Japan Macro Dashboard',
  description: 'Japan macroeconomic indicators dashboard powered by e-Stat and Bank of Japan API',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'JapanPulse',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon-512.png',
    apple: '/icon-512.png',  // ← これがiOS用
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-512.png" />  {/* ← これも追加 */}
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
