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
    icon: '/icon.svg',
    apple: '/icon.svg',
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
