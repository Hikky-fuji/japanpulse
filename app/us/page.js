'use client'
import React from 'react'

const indicators = [
  {
    group: 'Employment & Labor',
    color: '#1A56DB',
    bg: '#F0F4FF',
    border: '#6B8FE8',
    items: [
      {
        href: '/us/employment',
        title: 'US Employment',
        subtitle: 'NFP / Unemployment / AHE',
        badge: 'Monthly',
        desc: 'Nonfarm payrolls, sector breakdown, U-3/U-6 unemployment, average hourly earnings by sector, and labor force participation. Source: BLS via FRED.',
      },
    ],
  },
  {
    group: 'Prices',
    color: '#E67E22',
    bg: '#FFF8F0',
    border: '#F0A050',
    items: [
      {
        href: '/us-macro',
        title: 'CPI & Inflation',
        subtitle: 'CPI / Core CPI (ex. Food & Energy)',
        badge: 'Monthly',
        desc: 'Consumer price index year-over-year trends. Headline and core (ex. food & energy). Source: BLS via FRED.',
      },
    ],
  },
  {
    group: 'Growth & Policy',
    color: '#27AE60',
    bg: '#F0FAF4',
    border: '#5DBF80',
    items: [
      {
        href: '/us-macro',
        title: 'GDP & Retail Sales',
        subtitle: 'GDP QoQ SAAR / Retail YoY',
        badge: 'Quarterly / Monthly',
        desc: 'Nominal GDP growth (Q/Q SAAR) and advance retail sales year-over-year. Source: BEA / Census via FRED.',
      },
      {
        href: '/us-macro',
        title: 'Fed Policy',
        subtitle: 'Fed Funds Rate / FOMC',
        badge: 'Monthly',
        desc: 'Effective federal funds rate and next FOMC meeting schedule.',
      },
    ],
  },
]

export default function USHomePage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px', fontFamily: 'system-ui, sans-serif' }}>

      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>
          <a href="/" style={{ color: '#aaa', textDecoration: 'none' }}>🇯🇵 Japan Macro Dashboard</a>
          {' → '}
          <span style={{ color: '#333' }}>🇺🇸 US Macro Dashboard</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
          🇺🇸 US Macro Dashboard
        </h1>
        <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
          US macroeconomic indicators. Data from FRED (Federal Reserve Bank of St. Louis). Personal use.
        </p>
      </div>

      {indicators.map(group => (
        <div key={group.group} style={{ marginBottom: 36 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            paddingBottom: 8, borderBottom: `2px solid ${group.border}`,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.color, display: 'inline-block' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: group.color, margin: 0 }}>
              {group.group}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {group.items.map(item => (
              <a
                key={item.href + item.title}
                href={item.href}
                style={{
                  display: 'block', textDecoration: 'none',
                  background: '#fff', border: `1px solid ${group.border}`,
                  borderRadius: 10, padding: '16px 18px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 12px ${group.color}30`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{item.title}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                    background: group.color, color: '#fff', whiteSpace: 'nowrap', marginLeft: 8, marginTop: 2,
                  }}>
                    {item.badge}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: group.color, fontWeight: 600, marginBottom: 6 }}>
                  {item.subtitle}
                </div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                  {item.desc}
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #eee', fontSize: 11, color: '#aaa', textAlign: 'center' }}>
        Data: FRED (Federal Reserve Bank of St. Louis) · Personal use only
      </div>
    </main>
  )
}
