'use client'
import React, { useState } from 'react'

const indicators = [
  {
    group: { en: 'Prices', ja: '物価' },
    color: '#E67E22',
    bg: '#FFF8F0',
    border: '#F0A050',
    items: [
      {
        href: '/cpi',
        title:    { en: 'CPI (Consumer Prices)',         ja: 'CPI（消費者物価指数）' },
        subtitle: { en: 'National / Core / Core-Core',   ja: '全国 / コア / コアコア' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'National consumer price index. Primary indicator for BOJ inflation target.',
                    ja: '全国消費者物価指数。日銀のインフレ目標を判断する主要指標。' },
      },
      {
        href: '/tokyo-cpi',
        title:    { en: 'Tokyo CPI',                     ja: '東京都区部 CPI' },
        subtitle: { en: 'Tokyo Metropolitan Area',       ja: '東京都区部' },
        badge:    { en: 'Monthly / Leading Indicator',   ja: '月次 / 先行指標' },
        badgeColor: '#2980B9',
        desc:     { en: 'Released ~3 weeks before national CPI. Widely watched as a leading indicator.',
                    ja: '全国CPI発表の約3週間前に公表。先行指標として注目度が高い。' },
      },
      {
        href: '/ppi',
        title:    { en: 'PPI (Producer Prices)',         ja: 'PPI（企業物価指数）' },
        subtitle: { en: 'CGPI / SPPI',                  ja: 'CGPI / SPPI' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Domestic corporate, import/export, and services prices. Leading signal for upstream inflation.',
                    ja: '国内・輸出入・サービス価格。上流インフレの先行シグナル。' },
      },
    ],
  },
  {
    group: { en: 'Economic Growth', ja: '経済成長' },
    color: '#27AE60',
    bg: '#F0FAF4',
    border: '#5DBF80',
    items: [
      {
        href: '/gdp',
        title:    { en: 'GDP (Gross Domestic Product)',  ja: 'GDP（国内総生産）' },
        subtitle: { en: 'Real / Seasonally Adjusted',   ja: '実質 / 季節調整済み' },
        badge:    { en: 'Quarterly',                     ja: '四半期' },
        desc:     { en: 'Real GDP growth rate (Q/Q, Y/Y) with contribution breakdown. 2020 base.',
                    ja: '実質GDP成長率（Q/Q・Y/Y）と寄与度内訳。2020年基準。' },
      },
      {
        href: '/iip',
        title:    { en: 'Industrial Production Index',  ja: '鉱工業生産指数（IIP）' },
        subtitle: { en: 'IIP',                          ja: 'IIP' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Index of manufacturing and mining production activity. Leading indicator for economic conditions.',
                    ja: '製造業・鉱業の生産活動指数。景気の先行指標。' },
      },
      {
        href: '/tsip',
        title:    { en: 'Tertiary Sector Activity Index', ja: '第3次産業活動指数（TSIP）' },
        subtitle: { en: 'TSIP by sector',               ja: '業種別' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Service sector activity covering IT, retail, medical, hospitality and more. ~70% of Japan\'s GDP.',
                    ja: 'サービス業の活動指数。情報通信・小売・医療・宿泊等。日本GDPの約70%を占めるサービス部門。' },
      },
    ],
  },
  {
    group: { en: 'Corporate Activity', ja: '企業行動' },
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#A78BFA',
    items: [
      {
        href: '/machine-orders',
        title:    { en: 'Machine Orders',                  ja: '機械受注' },
        subtitle: { en: 'Core Private Orders (ex-Ships/Elec)', ja: '民需（船舶・電力除く）' },
        badge:    { en: 'Monthly',                         ja: '月次' },
        desc:     { en: 'Leading indicator for capital expenditure, 6-9M ahead of GDP capex.',
                    ja: 'GDP設備投資の6〜9ヶ月先行指標。コア機械受注の前年比・前月比。' },
      },
    ],
  },
  {
    group: { en: 'Private Consumption', ja: '個人消費' },
    color: '#9B59B6',
    bg: '#FAF0FF',
    border: '#C080E0',
    items: [
      {
        href: '/consumption',
        title:    { en: 'Household Consumption',        ja: '家計消費' },
        subtitle: { en: 'Family Income & Expenditure Survey', ja: '家計調査' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Consumption spending of 2+ person households. Real and nominal private consumption trends.',
                    ja: '2人以上世帯の消費支出。実質・名目の個人消費動向。' },
      },
    ],
  },
  {
    group: { en: 'Sentiment', ja: '景況感' },
    color: '#16A085',
    bg: '#F0FAF8',
    border: '#50C4A8',
    items: [
      {
        href: '/tankan',
        title:    { en: 'Tankan Survey',                ja: '日銀短観' },
        subtitle: { en: 'Business Conditions DI',       ja: '業況判断DI' },
        badge:    { en: 'Quarterly',                     ja: '四半期' },
        desc:     { en: 'BOJ quarterly business sentiment survey. DI for large manufacturers and non-manufacturers, enterprise size breakdown, and forecast accuracy.',
                    ja: '日銀の四半期景況調査。大企業製造業・非製造業のDI、規模別内訳、予測精度を掲載。' },
      },
      {
        href: '/watcher',
        title:    { en: 'Economy Watchers',             ja: '景気ウォッチャー調査' },
        subtitle: { en: 'Current / Outlook DI vs. Nikkei', ja: '現状・先行きDI vs 日経平均' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Cabinet Office street-level sentiment survey. Current and outlook DI by sector (households, corporate, employment) overlaid with Nikkei 225.',
                    ja: '内閣府の景気ウォッチャー調査。家計・企業・雇用関連の現状・先行きDIと日経平均の推移を掲載。' },
      },
    ],
  },
  {
    group: { en: 'Employment & Wages', ja: '雇用・賃金' },
    color: '#1A56DB',
    bg: '#F0F4FF',
    border: '#6B8FE8',
    items: [
      {
        href: '/wages',
        title:    { en: 'Monthly Labor Survey',         ja: '毎月勤労統計調査' },
        subtitle: { en: 'Nominal / Real Wages',         ja: '名目 / 実質賃金' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Nominal/real wage index (Y/Y), scheduled wages, part-time ratio. Published by MHLW.',
                    ja: '名目・実質賃金指数（Y/Y）、所定内給与、パート比率。厚生労働省公表。' },
      },
      {
        href: '/labour',
        title:    { en: 'Labour Force Survey',          ja: '労働力調査' },
        subtitle: { en: 'Unemployment / Employment / Participation', ja: '完全失業率 / 就業者数 / 労働参加率' },
        badge:    { en: 'Monthly · SA',                 ja: '月次 · 季調済' },
        desc:     { en: 'Unemployment rate (SA), employed persons (YoY), labor force participation rate. Source: Statistics Bureau.',
                    ja: '完全失業率（季節調整値）、就業者数（前年比）、労働参加率。総務省 統計局。' },
      },
      {
        href: '/job-ratio',
        title:    { en: 'Job-to-Applicant Ratio',       ja: '有効求人倍率' },
        subtitle: { en: 'Job Market Tightness',         ja: '需給バランス' },
        badge:    { en: 'Monthly · SA',                 ja: '月次 · 季調済' },
        desc:     { en: 'Effective job-to-applicant ratio (SA). Key indicator of labor demand-supply balance watched by BOJ.',
                    ja: '有効求人倍率（季節調整値）。日銀が注目する労働需給バランスの主要指標。' },
      },
    ],
  },
  {
    group: { en: 'Trade', ja: '貿易' },
    color: '#0E7490',
    bg: '#F0FDFF',
    border: '#67C8D4',
    items: [
      {
        href: '/trade',
        title:    { en: 'Trade Statistics',             ja: '貿易統計' },
        subtitle: { en: 'Export / Import / Balance',    ja: '輸出 / 輸入 / 貿易収支' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Japan trade statistics: exports, imports, trade balance by commodity and destination. Source: MOF Customs.',
                    ja: '日本の貿易統計：品目別・仕向地別の輸出入・貿易収支。財務省税関。' },
      },
    ],
  },
]

export default function HomePage() {
  const [lang, setLang] = useState('en')
  const t = (obj) => obj[lang]

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>
              Japan Macro Dashboard
            </h1>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
              {lang === 'en'
                ? "Tracking Japan's key macroeconomic indicators in real time. Data auto-updated from e-Stat (government statistics)."
                : '日本の主要マクロ経済指標をリアルタイムで追跡。e-Stat（政府統計）から自動更新。'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 16, flexShrink: 0 }}>
            <a
              href="/us"
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 12px',
                border: '1px solid #6B8FE8', borderRadius: 6,
                background: '#F0F4FF', textDecoration: 'none', color: '#1A56DB',
              }}
            >
              🇺🇸 US
            </a>
            <button
              onClick={() => setLang(l => l === 'en' ? 'ja' : 'en')}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 12px',
                border: '1px solid #ddd', borderRadius: 6,
                background: '#fff', cursor: 'pointer', color: '#444',
              }}
            >
              {lang === 'en' ? '日本語' : 'English'}
            </button>
          </div>
        </div>
      </div>

      {indicators.map(group => (
        <div key={group.group.en} style={{ marginBottom: 36 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            paddingBottom: 8, borderBottom: `2px solid ${group.border}`
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: '50%',
              background: group.color, display: 'inline-block'
            }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: group.color, margin: 0 }}>
              {t(group.group)}
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
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{t(item.title)}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
                    background: item.badgeColor ?? group.color, color: '#fff',
                    whiteSpace: 'nowrap', marginLeft: 8, marginTop: 2,
                  }}>
                    {t(item.badge)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: group.color, fontWeight: 600, marginBottom: 6 }}>
                  {t(item.subtitle)}
                </div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
                  {t(item.desc)}
                </div>
              </a>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #eee', fontSize: 11, color: '#aaa', textAlign: 'center' }}>
        Data Source: Statistics Bureau MIC / Cabinet Office / Bank of Japan · e-Stat API
      </div>
      <div style={{ marginTop: 12, textAlign: 'center' }}>
        <a href="/us-macro" style={{ fontSize: 11, color: '#aaa', textDecoration: 'none', opacity: 0.6 }}>🇺🇸 US Macro</a>
      </div>
    </main>
  )
}
