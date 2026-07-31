'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'JP OVERVIEW',
    match: path => !path.startsWith('/us') && !['/cpi', '/tokyo-cpi', '/ppi'].includes(path),
  },
  { href: '/us', label: 'US OVERVIEW', match: path => path === '/us' || path === '/us-macro' },
  { href: '/cpi', label: 'JP CPI', match: path => path === '/cpi' || path === '/tokyo-cpi' || path === '/ppi' },
  { href: '/us/cpi', label: 'US CPI', match: path => path === '/us/cpi' },
  { href: '/us/employment', label: 'US LABOR', match: path => path === '/us/employment' },
]

export function SiteHeader() {
  const pathname = usePathname() || '/'

  return (
    <header className="terminal-header">
      <div className="terminal-header__main">
        <Link className="terminal-brand" href="/">
          <span className="terminal-brand__mark">JP</span>
          <span className="terminal-brand__name">JAPANPULSE</span>
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
          <span className="terminal-statusbar__live">DATA AUTO-UPDATE ACTIVE</span>
          <span>JP: E-STAT / BOJ</span>
          <span>US: FRED / BLS / BEA</span>
          <span>WORKSPACE: MACRO MONITOR</span>
        </div>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="terminal-footer">
      <span>JAPANPULSE · MACRO DATA WORKSPACE</span>
      <span>PERSONAL RESEARCH USE</span>
    </footer>
  )
}
