'use client'
import React from 'react'

const indicators = [
  {
    group: '物価',
    color: '#E67E22',
    bg: '#FFF8F0',
    border: '#F0A050',
    items: [
      {
        href: '/cpi',
        title: 'CPI（消費者物価）',
        subtitle: '全国・コア・コアコア',
        badge: '月次',
        desc: '全国の消費者物価指数。BOJのインフレ目標の主要指標。',
      },
      {
        href: '/tokyo-cpi',
        title: 'Tokyo CPI',
        subtitle: '東京都区部',
        badge: '月次 / 先行指標',
        badgeColor: '#2980B9',
        desc: '全国CPI公表の約3週間前に発表。先行指標として注目。',
      },
      {
        href: '/ppi',
        title: 'PPI（企業物価）',
        subtitle: 'CGPI / SPPI',
        badge: '月次',
        desc: '国内企業物価・輸出入物価・サービス物価。川上インフレの先行シグナル。',
      },
    ],
  },
  {
    group: '経済成長',
    color: '#27AE60',
    bg: '#F0FAF4',
    border: '#5DBF80',
    items: [
      {
        href: '/gdp',
        title: 'GDP（国内総生産）',
        subtitle: '実質・季節調整済',
        badge: '四半期',
        desc: '実質GDP成長率（前期比・前年比）と寄与度内訳。2020年基準。',
      },
      {
        href: '/iip',
        title: '鉱工業生産指数',
        subtitle: 'IIP',
        badge: '月次',
        desc: '製造業・鉱業の生産活動を示す指数。景気の実態を把握する先行指標。',
      },
    ],
  },
  {
    group: '個人消費',
    color: '#9B59B6',
    bg: '#FAF0FF',
    border: '#C080E0',
    items: [
      {
        href: '/consumption',
        title: '家計消費支出',
        subtitle: '家計調査',
        badge: '月次',
        desc: '二人以上世帯の消費支出。実質・名目ベースでの個人消費動向。',
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
          日本の主要マクロ経済指標をリアルタイムで追跡。データはe-Stat（政府統計）から自動更新。
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
        データソース: 総務省統計局・内閣府・日本銀行 / e-Stat API
      </div>
    </main>
  )
}
