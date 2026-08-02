'use client'
import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { DashboardFreshness, DashboardState } from '../components/DashboardStatus'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function PPI() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/ppi', { signal: controller.signal })
      .then(async response => {
        const payload = await response.json()
        if (!response.ok || payload.error) {
          throw new Error(payload.error || `PPI request failed (${response.status})`)
        }
        setData(payload)
      })
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message)
      })

    return () => controller.abort()
  }, [])

  if (error) return (
    <DashboardState type="error" message={`BOJ producer-price data could not be loaded. ${error}`} />
  )

  if (!data?.cgpi?.length) return (
    <DashboardState />
  )

  const { cgpi, import_ppi, export_ppi, sppi } = data

  const latest = cgpi.at(-1)
  const prev   = cgpi.at(-2)
  const latestImport = import_ppi.at(-1)
  const latestExport = export_ppi.at(-1)
  const latestSppi   = sppi.at(-1)

  // 共通ラベル（CGPI基準）
  const labels = cgpi.map(v => v.date)

  // Y/Y計算（12ヶ月前比）
  const calcYoY = (arr) => arr.map((v, i) => {
    if (i < 12) return null
    const prev12 = arr[i - 12]?.value
    if (prev12 == null || prev12 === 0) return null
    return parseFloat(((v.value - prev12) / prev12 * 100).toFixed(2))
  })

  const cgpiYoY   = calcYoY(cgpi)
  const importYoY = labels.map(d => {
    const i = import_ppi.findIndex(v => v.date === d)
    if (i < 12) return null
    const cur = import_ppi[i]?.value
    const p12 = import_ppi[i - 12]?.value
    return (cur && p12) ? parseFloat(((cur - p12) / p12 * 100).toFixed(2)) : null
  })
  const exportYoY = labels.map(d => {
    const i = export_ppi.findIndex(v => v.date === d)
    if (i < 12) return null
    const cur = export_ppi[i]?.value
    const p12 = export_ppi[i - 12]?.value
    return (cur && p12) ? parseFloat(((cur - p12) / p12 * 100).toFixed(2)) : null
  })
  const sppiYoY = labels.map(d => {
    const i = sppi.findIndex(v => v.date === d)
    if (i < 12) return null
    const cur = sppi[i]?.value
    const p12 = sppi[i - 12]?.value
    return (cur && p12) ? parseFloat(((cur - p12) / p12 * 100).toFixed(2)) : null
  })

  // Four-series inflation momentum comparison (Y/Y)
  const chart1 = {
    labels,
    datasets: [
      { label: 'Domestic CGPI (Y/Y %)', data: cgpiYoY, borderColor: '#378ADD', borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true },
      { label: 'Export PPI (Y/Y %)', data: exportYoY, borderColor: '#9B8AFB', borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true },
      { label: 'Import PPI (Y/Y %)', data: importYoY, borderColor: '#E24B4A', borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true },
      { label: 'Services PPI / SPPI (Y/Y %)', data: sppiYoY, borderColor: '#1D9E75', borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true },
    ]
  }

  // Goods producer-price indexes
  const chart2 = {
    labels,
    datasets: [
      { label: 'Import PPI (Index)', data: labels.map(d => import_ppi.find(v => v.date === d)?.value ?? null), borderColor: '#E24B4A', borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true },
      { label: 'Export PPI (Index)', data: labels.map(d => export_ppi.find(v => v.date === d)?.value ?? null), borderColor: '#378ADD', borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true },
      { label: 'Domestic CGPI (Index)', data: cgpi.map(v => v.value), borderColor: '#888', borderWidth: 1.5, pointRadius: 0, tension: 0.3, borderDash: [4, 3] },
    ]
  }

  // Services producer-price index
  const chart3 = {
    labels,
    datasets: [
      { label: 'SPPI (Services PPI)', data: labels.map(d => sppi.find(v => v.date === d)?.value ?? null), borderColor: '#1D9E75', borderWidth: 2, pointRadius: 3, tension: 0.3, spanGaps: true },
    ]
  }

  const lineOpts = (yLabel = '') => ({
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: { y: { ticks: { callback: v => v.toFixed(1) + yLabel } } }
  })

  const s = {
    wrap:      { maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' },
    nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
    grid4:     { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' },
    card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:   { fontSize: '24px', fontWeight: '600', color: '#111' },
    grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
    note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
  }

  const latestCgpiYoY = cgpiYoY.at(-1)
  const prevCgpiYoY   = cgpiYoY.at(-2)
  const kpiColor = v => v > 0 ? '#E24B4A' : '#1D9E75'
  const fmt = (v, s='') => v != null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}${s}` : '--'

  return (
    <main className="dashboard-page" style={s.wrap}>
      <DashboardFreshness data={data} source="BOJ" />
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/iip" style={s.nav}>IIP</a>
          <a href="/consumption" style={s.nav}>Consumption</a>
          <span style={{fontSize:'20px', fontWeight:'600', color:'#111'}}>
            Producer Prices (CGPI / SPPI)
          </span>
        </div>
        <span style={{fontSize:'12px', color:'#888'}}>Source: Bank of Japan API · Latest: {latest?.date}</span>
      </div>

      <div style={s.grid4}>
        <div style={s.card}>
          <div style={s.cardLabel}>Domestic CGPI (Y/Y)</div>
          <div style={s.cardVal}>{fmt(latestCgpiYoY, '%')}</div>
          <div style={{fontSize:'11px', color: kpiColor(latestCgpiYoY), marginTop:'3px'}}>prev: {fmt(prevCgpiYoY, '%')}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Import PPI (Index)</div>
          <div style={s.cardVal}>{latestImport?.value?.toFixed(1) ?? '--'}</div>
          <div style={{fontSize:'11px', color:'#888', marginTop:'3px'}}>{latestImport?.date}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Export PPI (Index)</div>
          <div style={s.cardVal}>{latestExport?.value?.toFixed(1) ?? '--'}</div>
          <div style={{fontSize:'11px', color:'#888', marginTop:'3px'}}>{latestExport?.date}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>SPPI Services (Index)</div>
          <div style={s.cardVal}>{latestSppi?.value?.toFixed(1) ?? '--'}</div>
          <div style={{fontSize:'11px', color:'#888', marginTop:'3px'}}>{latestSppi?.date}</div>
        </div>
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>Producer Price Momentum — Domestic / Export / Import / Services (Y/Y %)</div>
        <Line data={chart1} options={lineOpts('%')} />
        <div style={s.note}>Four official BOJ series. Import-price pressure can lead domestic producer and consumer prices.</div>
      </div>

      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Import / Export / Domestic PPI (Index, 2020=100)</div>
          <Line data={chart2} options={lineOpts()} />
          <div style={s.note}>※ Import-export spread reflects terms of trade / JPY pass-through</div>
        </div>
        <div style={s.box}>
          <div style={s.boxTitle}>Services Producer Price Index (SPPI, 2020=100)</div>
          <Line data={chart3} options={lineOpts()} />
          <div style={s.note}>Business-to-business services including transport, ICT, finance, and real estate.</div>
        </div>
      </div>
    </main>
  )
}
