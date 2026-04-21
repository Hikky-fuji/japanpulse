'use client'
import React from 'react'

const indicators = [
  {
    group: 'Prices',
    color: '#E67E22',
    bg: '#FFF8F0',
    border: '#F0A050',
    items: [
      {
        href: '/cpi',
        title: 'CPI (Consumer Prices)',
        subtitle: 'National / Core / Core-Core',
        badge: 'Monthly',
        desc: 'National consumer price index. Primary indicator for BOJ inflation target.',
      },
      {
        href: '/tokyo-cpi',
        title: 'Tokyo CPI',
        subtitle: 'Tokyo Metropolitan Area',
        badge: 'Monthly / Leading Indicator',
        badgeColor: '#2980B9',
        desc: 'Released ~3 weeks before national CPI. Widely watched as a leading indicator.',
      },
      {
        href: '/ppi',
        title: 'PPI (Producer Prices)',
        subtitle: 'CGPI / SPPI',
        badge: 'Monthly',
        desc: 'Domestic corporate, import/export, and services prices. Leading signal for upstream inflation.',
      },
    ],
  },
  {
    group: 'Economic Growth',
    color: '#27AE60',
    bg: '#F0FAF4',
    border: '#5DBF80',
    items: [
      {
        href: '/gdp',
        title: 'GDP (Gross Domestic Product)',
        subtitle: 'Real / Seasonally Adjusted',
        badge: 'Quarterly',
        desc: 'Real GDP growth rate (Q/Q, Y/Y) with contribution breakdown. 2020 base.',
      },
      {
        href: '/iip',
        title: 'Industrial Production Index',
        subtitle: 'IIP',
        badge: 'Monthly',
        desc: 'Index of manufacturing and mining production activity. Leading indicator for economic conditions.',
      },
    ],
  },
  {
    group: 'Private Consumption',
    color: '#9B59B6',
    bg: '#FAF0FF',
    border: '#C080E0',
    items: [
      {
        href: '/consumption',
        title: 'Household Consumption',
        subtitle: 'Family Income & Expenditure Survey',
        badge: 'Monthly',
        desc: 'Consumption spending of 2+ person households. Real and nominal private consumption trends.',
      },
    ],
  },
  {
    group: 'Sentiment',
    color: '#16A085',
    bg: '#F0FAF8',
    border: '#50C4A8',
    items: [
      {
        href: '/tankan',
        title: 'Tankan Survey',
        subtitle: 'Business Conditions DI',
        badge: 'Quarterly',
        desc: 'BOJ quarterly business sentiment survey. DI for large manufacturers and non-manufacturers, enterprise size breakdown, and forecast accuracy.',
      },
    ],
  },
  {
    group: 'Employment & Wages',
    color: '#1A56DB',
    bg: '#F0F4FF',
    border: '#6B8FE8',
    items: [
      {
        href: '/wages',
        title: 'Monthly Labor Survey',
        subtitle: 'Nominal / Real Wages',
        badge: 'Monthly',
        desc: 'Nominal/real wage index (Y/Y), scheduled wages, part-time ratio. Published by MHLW.',
      },
    ],
  },
]

export default function HomePage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>
          Japan Macro Dashboard
        </h1>
        <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
          Tracking Japan's key macroeconomic indicators in real time. Data auto-updated from e-Stat (government statistics).
        </p>
      </div>

      {indicators.map(group => (
        <div key={group.group} style={{ marginBottom: 36 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            paddingBottom: 8, borderBottom: `2px solid ${group.border}`
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: group.color, display: 'inline-block'
            }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: group.color, margin: 0 }}>
              {group.group}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {group.items.map(item => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'block', textDecoration: 'none',
                  background: '#fff', border: `1px solid ${group.border}`,
                  borderRadius: 10, padding: '16px 18px',
                  transition: 'box-shadow 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 12px ${group.color}30`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{item.title}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                    background: item.badgeColor ?? group.color, color: '#fff',
                    whiteSpace: 'nowrap', marginLeft: 8, marginTop: 2,
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
        Data Source: Statistics Bureau MIC / Cabinet Office / Bank of Japan · e-Stat API
      </div>
    </main>
  )
}
