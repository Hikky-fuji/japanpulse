import { Analytics } from "@vercel/analytics/next"
import ChartTheme from './components/ChartTheme'
import { SiteFooter, SiteHeader } from './components/SiteChrome'
import './globals.css'

export const metadata = {
  metadataBase: new URL('https://japanpulse.vercel.app'),
  title: {
    default: 'JapanPulse Macro Workspace',
    template: '%s | JapanPulse',
  },
  description: 'Japan and US macroeconomic dashboards with official-source inflation, growth, labor, consumption, survey and policy data.',
  applicationName: 'JapanPulse',
  keywords: [
    'Japan economy',
    'US economy',
    'macroeconomic dashboard',
    'CPI',
    'PPI',
    'employment',
    'GDP',
    'FRED',
    'e-Stat',
  ],
  authors: [{ name: 'JapanPulse' }],
  creator: 'JapanPulse',
  openGraph: {
    type: 'website',
    siteName: 'JapanPulse',
    title: 'JapanPulse Macro Workspace',
    description: 'Track Japan and US macro conditions from official data sources.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'JapanPulse Macro Workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JapanPulse Macro Workspace',
    description: 'Track Japan and US macro conditions from official data sources.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
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
