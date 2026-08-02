'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Japan',
    match: path => !path.startsWith('/us') && !['/cpi', '/tokyo-cpi', '/ppi'].includes(path),
  },
  { href: '/us', label: 'United States', match: path => path === '/us' || path === '/us-macro' },
  { href: '/cpi', label: 'Japan CPI', match: path => path === '/cpi' || path === '/tokyo-cpi' || path === '/ppi' },
  { href: '/us/cpi', label: 'US Prices', match: path => path === '/us/cpi' || path === '/us/ppi' },
  { href: '/us/employment', label: 'US Employment', match: path => path === '/us/employment' },
  { href: '/status', label: 'Data Status', match: path => path === '/status' },
]

const SEARCH_ITEMS = [
  { href: '/status', country: 'OPS', label: 'Data Status & Release Calendar', description: 'Feed freshness, failures and official release dates', keywords: 'health stale failed schedule operations' },
  { href: '/', country: 'JP', label: 'Japan Macro Workspace', description: 'All Japan indicators and current pulse', keywords: 'overview home' },
  { href: '/cpi', country: 'JP', label: 'CPI', description: 'National consumer prices', keywords: 'inflation core core-core' },
  { href: '/tokyo-cpi', country: 'JP', label: 'Tokyo CPI', description: 'Tokyo consumer prices', keywords: 'inflation leading' },
  { href: '/ppi', country: 'JP', label: 'Corporate & Services Prices', description: 'CGPI and SPPI', keywords: 'ppi producer boj inflation' },
  { href: '/gdp', country: 'JP', label: 'GDP', description: 'Real growth and demand contributions', keywords: 'economic growth' },
  { href: '/iip', country: 'JP', label: 'Industrial Production', description: 'Production, shipments and inventory', keywords: 'iip meti hard data' },
  { href: '/tsip', country: 'JP', label: 'Tertiary Industry Activity', description: 'Services activity', keywords: 'tsip services production' },
  { href: '/machine-orders', country: 'JP', label: 'Machine Orders', description: 'Core private machinery demand', keywords: 'capex investment' },
  { href: '/consumption', country: 'JP', label: 'Private Consumption', description: 'Household spending', keywords: 'family survey retail' },
  { href: '/tankan', country: 'JP', label: 'BOJ Tankan', description: 'Business conditions survey', keywords: 'sentiment survey diffusion index' },
  { href: '/watcher', country: 'JP', label: 'Economy Watchers', description: 'Current conditions and outlook DI', keywords: 'sentiment survey' },
  { href: '/wages', country: 'JP', label: 'Wages', description: 'Real, nominal and scheduled pay', keywords: 'earnings labor' },
  { href: '/labour', country: 'JP', label: 'Labor Market', description: 'Employment and unemployment', keywords: 'jobs unemployment' },
  { href: '/job-ratio', country: 'JP', label: 'Job-to-Applicant Ratio', description: 'Labor demand relative to applicants', keywords: 'jobs openings mhlw' },
  { href: '/trade', country: 'JP', label: 'Trade', description: 'Exports, imports and trade balance', keywords: 'external sector flow map' },
  { href: '/us', country: 'US', label: 'US Macro Workspace', description: 'All US indicators and current pulse', keywords: 'overview home united states' },
  { href: '/us/cpi', country: 'US', label: 'US CPI', description: 'Headline, core and supercore inflation', keywords: 'prices inflation bls' },
  { href: '/us/ppi', country: 'US', label: 'US PPI', description: 'Producer prices and pipeline inflation', keywords: 'prices inflation producer core final demand bls' },
  { href: '/us/employment', country: 'US', label: 'US Employment', description: 'Payrolls, unemployment and wages', keywords: 'nfp jobs earnings' },
  { href: '/us/initial-claims', country: 'US', label: 'Initial Claims', description: 'Weekly unemployment insurance claims', keywords: 'continuing labor weekly' },
  { href: '/us/consumption', country: 'US', label: 'PCE & Personal Income', description: 'PCE inflation, spending, income and saving', keywords: 'core pce deflator consumption bea' },
  { href: '/us/jolts', country: 'US', label: 'JOLTS', description: 'Openings, hires, quits and separations', keywords: 'labor flows vacancies bls' },
  { href: '/us/manufacturing', country: 'US', label: 'Manufacturing Surveys', description: 'Empire, Philly Fed and ISM sequence', keywords: 'ny new york sentiment soft data' },
  { href: '/us-macro', country: 'US', label: 'US Growth & Fed Policy', description: 'GDP, retail sales, fed funds and SEP', keywords: 'fomc rates monetary policy' },
]

function IndicatorSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const onKeyDown = event => {
      const target = event.target
      const isTyping = target instanceof HTMLElement
        && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      const shortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (shortcut || (!isTyping && event.key === '/')) {
        event.preventDefault()
        setOpen(true)
      } else if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return SEARCH_ITEMS
    return SEARCH_ITEMS.filter(item => (
      `${item.country} ${item.label} ${item.description} ${item.keywords}`
        .toLowerCase()
        .includes(normalized)
    ))
  }, [query])

  return (
    <>
      <button className="terminal-search-button" type="button" onClick={() => setOpen(true)}>
        <span>Search</span>
        <kbd>/</kbd>
      </button>
      {open && typeof document !== 'undefined' ? createPortal((
        <div className="terminal-search" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) setOpen(false)
        }}>
          <section aria-label="Search indicators" aria-modal="true" className="terminal-search__dialog" role="dialog">
            <div className="terminal-search__input-row">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search all Japan and US indicators"
                onChange={event => setQuery(event.target.value)}
                placeholder="Search CPI, JOLTS, wages, GDP…"
                ref={inputRef}
                type="search"
                value={query}
              />
              <button type="button" onClick={() => setOpen(false)}>ESC</button>
            </div>
            <div className="terminal-search__meta">
              <span>{results.length} dashboards</span>
              <span>Japan + United States</span>
            </div>
            <div className="terminal-search__results">
              {results.map(item => (
                <Link href={item.href} key={item.href} onClick={() => setOpen(false)}>
                  <b>{item.country}</b>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                  <i aria-hidden="true">→</i>
                </Link>
              ))}
              {results.length === 0 ? (
                <p>No matching dashboard. Try an indicator name or data theme.</p>
              ) : null}
            </div>
          </section>
        </div>
      ), document.body) : null}
    </>
  )
}

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
          {NAV_ITEMS.map(item => {
            const isActive = item.match(pathname)
            return (
              <Link
                aria-current={isActive ? 'page' : undefined}
                className={`terminal-nav__link${isActive ? ' is-active' : ''}`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            )
          })}
          <IndicatorSearch />
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
