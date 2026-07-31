'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Japan',
    match: path => !path.startsWith('/us') && !['/cpi', '/tokyo-cpi', '/ppi'].includes(path),
  },
  { href: '/us', label: 'United States', match: path => path === '/us' || path === '/us-macro' },
  { href: '/cpi', label: 'Japan CPI', match: path => path === '/cpi' || path === '/tokyo-cpi' || path === '/ppi' },
  { href: '/us/cpi', label: 'US CPI', match: path => path === '/us/cpi' },
  { href: '/us/employment', label: 'US Employment', match: path => path === '/us/employment' },
]

export function SiteHeader() {
  const pathname = usePathname() || '/'

  return (
    <header className="terminal-header">
      <div className="terminal-header__main">
        <Link className="terminal-brand" href="/">
          <span className="terminal-brand__mark">JP</span>
          <span className="terminal-brand__name">JapanPulse Workspace</span>
        </Link>
        <nav className="terminal-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map(item => (
            <Link
              className={`terminal-nav__link${item.match(pathname) ? ' is-active' : ''}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="terminal-statusbar">
        <div className="terminal-statusbar__inner">
          <span className="terminal-statusbar__sources">Official data sources</span>
          <span>Japan · e-Stat / BOJ</span>
          <span>United States · FRED / BLS / BEA</span>
          <span>Workspace · Macro Monitor</span>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="terminal-footer">
      <span>JapanPulse · Macro Data Workspace</span>
      <span>Official-source economic data</span>
    </footer>
  )
}
