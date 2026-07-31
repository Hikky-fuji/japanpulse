import { Analytics } from "@vercel/analytics/next"
import ChartTheme from './components/ChartTheme'
import { SiteFooter, SiteHeader } from './components/SiteChrome'
import './globals.css'

export const metadata = {
  title: {
    default: 'JapanPulse Macro Terminal',
    template: '%s | JapanPulse',
  },
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
        <ChartTheme />
        <SiteHeader />
        <div className="site-content">{children}</div>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  )
}
