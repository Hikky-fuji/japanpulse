'use client'
import { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const SECTOR_COLORS = [
  '#1A56DB', '#E74C3C', '#27AE60', '#F39C12',
  '#9B59B6', '#16A085', '#E67E22', '#2980B9',
]

export default function TsipPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/tsip').then(r => r.json()).then(setData)
  }, [])

  if (!data?.series?.length) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading...</div>
  )

  const { latest, series } = data
  const total = series.find(s => s.code === 'K1D000000I')
  const sectors = series.filter(s => s.code !== 'K1D000000I')
  const dates = total.data.map(d => d.date)

  const yoyDiff = latest.yoy != null && latest.yoyPrev != null
    ? parseFloat((latest.yoy - latest.yoyPrev).toFixed(1)) : null
  const momDiff = latest.mom != null && latest.momPrev != null
    ? parseFloat((latest.mom - latest.momPrev).toFixed(1)) : null

  const s = {
    wrap:      { maxWidth: '980px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' },
    nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
    grid3:     { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' },
    card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:   { fontSize: '26px', fontWeight: '600', color: '#111' },
    box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
    badge:     { display: 'inline-block', fontSize: '10px', background: '#E8F0FE', color: '#1A56DB', borderRadius: '4px', padding: '2px 7px', marginLeft: '8px', fontWeight: '600' },
    note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
  }

  // Chart 1: Total TSIP YoY line
  const chart1 = {
    labels: dates,
    datasets: [
      {
        label: 'TSIP Total YoY (%)',
        data: total.data.map(d => d.yoy),
        borderColor: '#1A56DB',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
      {
        label: '0% Reference',
        data: dates.map(() => 0),
        borderColor: '#bbb',
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [5, 4],
        fill: false,
      },
    ],
  }

  const chart1Opts = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    spanGaps: false,
    scales: {
      y: { ticks: { callback: v => v.toFixed(1) + '%' } },
    },
  }

  // Chart 2: Sector YoY bar (latest month)
  const latestDate = dates.at(-1)
  const sectorLabels = sectors.map(s => s.label)
  const sectorYoY = sectors.map(s => s.data.at(-1)?.yoy ?? null)
  const sectorColors = sectorYoY.map(v => v == null ? '#ccc' : v >= 0 ? '#1A56DB' : '#E74C3C')

  const chart2 = {
    labels: sectorLabels,
    datasets: [
      {
        label: `Sector YoY (%) — ${latestDate}`,
        data: sectorYoY,
        backgroundColor: sectorColors,
        borderRadius: 4,
      },
    ],
  }

  const chart2Opts = {
    responsive: true,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ctx.raw != null ? ctx.raw.toFixed(1) + '%' : 'N/A' } },
    },
    scales: {
      x: { ticks: { callback: v => v.toFixed(0) + '%' } },
    },
  }

  // Chart 3: Multi-line YoY by sector
  const chart3 = {
    labels: dates,
    datasets: sectors.map((sec, i) => ({
      label: sec.label,
      data: sec.data.map(d => d.yoy),
      borderColor: SECTOR_COLORS[i % SECTOR_COLORS.length],
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
    })),
  }

  const chart3Opts = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    spanGaps: false,
    scales: {
      y: { ticks: { callback: v => v.toFixed(0) + '%' } },
    },
  }

  // Chart 4: SA MoM line (total)
  const chart4 = {
    labels: dates,
    datasets: [
      {
        label: 'TSIP Total MoM SA (%)',
        data: total.data.map(d => d.mom),
        borderColor: '#27AE60',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
      {
        label: '0% Reference',
        data: dates.map(() => 0),
        borderColor: '#bbb',
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [5, 4],
        fill: false,
      },
    ],
  }

  const chart4Opts = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    spanGaps: false,
    scales: {
      y: { ticks: { callback: v => v.toFixed(1) + '%' } },
    },
  }

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/iip" style={s.nav}>IIP</a>
          <a href="/gdp" style={s.nav}>GDP</a>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>
            Tertiary Sector Activity Index (TSIP)
            <span style={s.badge}>Monthly</span>
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>
          Source: METI · Latest: {latest.date}
        </span>
      </div>

      {/* KPI cards */}
      <div style={s.grid3}>
        <div style={s.card}>
          <div style={s.cardLabel}>YoY (NSA)</div>
          <div style={{ ...s.cardVal, color: latest.yoy != null ? (latest.yoy >= 0 ? '#1D9E75' : '#E24B4A') : '#111' }}>
            {latest.yoy != null ? (latest.yoy >= 0 ? '+' : '') + latest.yoy.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: yoyDiff === null ? '#888' : yoyDiff > 0 ? '#1D9E75' : yoyDiff < 0 ? '#E24B4A' : '#888' }}>
            {yoyDiff !== null ? (yoyDiff > 0 ? '+' : '') + yoyDiff.toFixed(1) + 'pp vs prev mo' : ''}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>MoM (SA)</div>
          <div style={{ ...s.cardVal, color: latest.mom != null ? (latest.mom >= 0 ? '#1D9E75' : '#E24B4A') : '#111' }}>
            {latest.mom != null ? (latest.mom >= 0 ? '+' : '') + latest.mom.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: momDiff === null ? '#888' : momDiff > 0 ? '#1D9E75' : momDiff < 0 ? '#E24B4A' : '#888' }}>
            {momDiff !== null ? (momDiff > 0 ? '+' : '') + momDiff.toFixed(1) + 'pp vs prev mo' : ''}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Index (2020=100)</div>
          <div style={s.cardVal}>
            {latest.nsa != null ? latest.nsa.toFixed(1) : '--'}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: '#888' }}>
            {latest.date}
          </div>
        </div>
      </div>

      {/* Chart 1: Total YoY */}
      <div style={s.box}>
        <div style={s.boxTitle}>TSIP Total YoY — 24 Months (NSA)</div>
        <Line data={chart1} options={chart1Opts} />
        <div style={s.note}>Year-on-year change. Dashed: 0% reference. Source: METI Tertiary Sector Activity Index</div>
      </div>

      {/* Chart 2: Sector bar */}
      <div style={s.box}>
        <div style={s.boxTitle}>Sector YoY ({latestDate}) — Latest Month Breakdown</div>
        <Bar data={chart2} options={chart2Opts} />
        <div style={s.note}>Blue = positive, Red = negative. Source: METI Tertiary Sector Activity Index</div>
      </div>

      {/* Chart 3: Sector multi-line YoY */}
      <div style={s.box}>
        <div style={s.boxTitle}>Sector YoY Trends — 24 Months (All Sectors)</div>
        <Line data={chart3} options={chart3Opts} />
        <div style={s.note}>Year-on-year change (NSA basis). Colors per sector in legend. Source: METI</div>
      </div>

      {/* Chart 4: SA MoM */}
      <div style={s.box}>
        <div style={s.boxTitle}>TSIP Total MoM — 24 Months (SA)</div>
        <Line data={chart4} options={chart4Opts} />
        <div style={s.note}>Month-on-month change on SA basis. Dashed: 0% reference. Source: METI Tertiary Sector Activity Index</div>
      </div>
    </main>
  )
}
