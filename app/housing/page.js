'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { DashboardFreshness, DashboardState } from '../components/DashboardStatus'
import styles from '../us/analysis-dashboard.module.css'

ChartJS.register(CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip)

const COLORS = { orange: '#f08a24', blue: '#42a9bc', green: '#60d4af', red: '#ff6b6b', violet: '#a99af0', muted: '#c7cdd1', grid: '#4a5258' }
const valid = Number.isFinite
const clean = item => (item?.observations || []).filter(point => valid(point.value))
const byMonth = item => new Map(clean(item).map(point => [point.date.slice(0, 7), point.value]))
const pct = (value, digits = 1) => valid(value) ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}%` : '—'
const level = value => valid(value) ? Math.round(value / 1000).toLocaleString('en-US') : '—'
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const change = (current, previous) => valid(current) && valid(previous) && previous !== 0 ? (current / previous - 1) * 100 : null
const monthLabel = month => new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`))

function options({ percent = false } = {}) {
  return {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { color: COLORS.muted, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, font: { size: 10 } } }, tooltip: { backgroundColor: '#142b3c', padding: 10 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: COLORS.muted, maxTicksLimit: 12, font: { size: 9 } } },
      y: { grid: { color: COLORS.grid }, ticks: { color: COLORS.muted, callback: value => percent ? `${value}%` : `${Math.round(value / 1000)}k`, font: { size: 9 } } },
    },
  }
}

function MetricCard({ label, value, period, rows, tone = '' }) {
  return <article className={`${styles.metricCard} ${tone ? styles[tone] : ''}`}>
    <div className={styles.metricLabel}>{label}</div><div className={styles.metricHeadline}><strong>{value}</strong><span>{period}</span></div>
    <div className={styles.metricRows}>{rows.map(row => <div key={row.label}><span>{row.label}</span><b>{row.value}</b></div>)}</div>
  </article>
}

export default function JapanHousingDashboard() {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/housing', { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || body.error) throw new Error(body.error || 'Unable to load housing-starts data.')
        return body
      })
      .then(setPayload)
      .catch(fetchError => { if (fetchError.name !== 'AbortError') setError(fetchError.message) })
    return () => controller.abort()
  }, [])

  const model = useMemo(() => {
    if (!payload) return null
    const maps = Object.fromEntries(Object.entries(payload.series).map(([key, item]) => [key, byMonth(item)]))
    const yoyKeys = ['totalYoy', 'ownedYoy', 'rentedYoy', 'builtForSaleYoy']
    const commonMonth = [...maps.totalYoy.keys()].filter(month => yoyKeys.every(key => maps[key].has(month))).sort().at(-1)
    const saarMonth = [...maps.startsSaar.keys()].sort().at(-1)
    if (!commonMonth || !saarMonth) return null
    const commonMonths = [...maps.totalYoy.keys()].filter(month => month <= commonMonth).sort()
    const saarMonths = [...maps.startsSaar.keys()].filter(month => month <= saarMonth).sort()
    const saarValues = saarMonths.map(month => maps.startsSaar.get(month))
    const currentSaar = saarValues.at(-1)
    const saarMomentum = change(average(saarValues.slice(-3)), average(saarValues.slice(-6, -3)))
    const current = Object.fromEntries(yoyKeys.map(key => [key, maps[key].get(commonMonth)]))
    const state = current.totalYoy > 3 && saarMomentum > 0
      ? { label: 'Housing construction expanding', tone: 'positiveText' }
      : current.totalYoy < -3 && saarMomentum < 0
        ? { label: 'Housing construction cooling', tone: 'negativeText' }
        : { label: 'Housing construction mixed', tone: 'neutralText' }
    const chartMonths = commonMonths.slice(-60)
    const tableMonths = commonMonths.slice(-12).reverse()

    return {
      commonMonth, saarMonth, current, currentSaar, saarMomentum, state,
      saarChart: { labels: saarMonths.slice(-120).map(monthLabel), datasets: [{ label: 'Housing starts · SAAR', data: saarValues.slice(-120), borderColor: COLORS.orange, pointRadius: 0, borderWidth: 2, tension: .2 }] },
      categoryChart: { labels: chartMonths.map(monthLabel), datasets: [
        { label: 'Total', data: chartMonths.map(month => maps.totalYoy.get(month)), borderColor: COLORS.orange, pointRadius: 0, borderWidth: 2, tension: .2 },
        { label: 'Owner-occupied', data: chartMonths.map(month => maps.ownedYoy.get(month)), borderColor: COLORS.blue, pointRadius: 0, borderWidth: 1.7, tension: .2 },
        { label: 'Rental', data: chartMonths.map(month => maps.rentedYoy.get(month)), borderColor: COLORS.green, pointRadius: 0, borderWidth: 1.7, tension: .2 },
        { label: 'Built for sale', data: chartMonths.map(month => maps.builtForSaleYoy.get(month)), borderColor: COLORS.violet, pointRadius: 0, borderWidth: 1.7, tension: .2 },
      ] },
      rows: tableMonths.map(month => ({ month, total: maps.totalYoy.get(month), owned: maps.ownedYoy.get(month), rented: maps.rentedYoy.get(month), sale: maps.builtForSaleYoy.get(month) })),
    }
  }, [payload])

  if (error) return <DashboardState type="error" message={error} />
  if (!model) return <DashboardState message="Loading MLIT housing-starts series from the Statistics Dashboard API…" />

  return <main className={styles.page}><div className={styles.shell}>
    <DashboardFreshness data={payload} source="MLIT · Statistics Dashboard API" />
    <nav className={styles.topbar}><Link href="/">← Japan Macro Dashboard</Link><span>HOUSING / CONSTRUCTION / MONTHLY</span></nav>
    <header className={styles.hero}>
      <div className={styles.eyebrow}>JAPAN / HOUSING & REAL ESTATE</div><h1>Housing Starts Monitor</h1>
      <p>New construction at a seasonally adjusted annual rate, with tenure-level momentum across owner-occupied, rental and built-for-sale housing.</p>
      <div className={styles.heroMeta}><span><i />Auto-updated from the government Statistics Dashboard API</span><span>SAAR: {monthLabel(model.saarMonth)}</span><span>Category comparison: {monthLabel(model.commonMonth)}</span></div>
    </header>

    <section className={styles.metricGrid}>
      <MetricCard label="Housing Starts" value={`${level(model.currentSaar)}k`} period={`dwellings SAAR · ${monthLabel(model.saarMonth)}`} tone="warning" rows={[{ label: '3M vs prior 3M', value: pct(model.saarMomentum) }, { label: 'Total YoY', value: pct(model.current.totalYoy) }]} />
      <MetricCard label="Owner-Occupied" value={pct(model.current.ownedYoy)} period="YoY" rows={[{ label: 'Reference month', value: monthLabel(model.commonMonth) }, { label: 'Macro role', value: 'Household demand' }]} />
      <MetricCard label="Rental Housing" value={pct(model.current.rentedYoy)} period="YoY" tone="positive" rows={[{ label: 'Reference month', value: monthLabel(model.commonMonth) }, { label: 'Macro role', value: 'Rental supply' }]} />
      <MetricCard label="Built for Sale" value={pct(model.current.builtForSaleYoy)} period="YoY" tone="violet" rows={[{ label: 'Reference month', value: monthLabel(model.commonMonth) }, { label: 'Macro role', value: 'Developer demand' }]} />
    </section>

    <section className={styles.section}>
      <header className={styles.sectionHeader}><div><span>01 / CONSTRUCTION CYCLE</span><h2>Housing starts and near-term momentum</h2></div><p>The level uses the official seasonally adjusted annual rate; the comparison uses a three-month average to reduce monthly noise.</p></header>
      <div className={styles.mainGrid}>
        <article className={styles.panel}><div className={styles.panelHeading}><div><h3>New housing starts</h3><p>Dwellings · SAAR · ten-year window</p></div><span className={styles.tag}>{monthLabel(model.saarMonth)}</span></div><div className={styles.chart}><Line data={model.saarChart} options={options()} /></div></article>
        <aside className={styles.analysis}><div><div className={styles.analysisKicker}>HOUSING READ</div><div className={styles.analysisScore}><div><strong className={styles[model.state.tone]}>{model.state.label}</strong><small>Level and breadth assessment</small></div><b>{pct(model.current.totalYoy)}</b></div><ul>
          <li><span>Three-month construction impulse</span><b>{pct(model.saarMomentum)}</b></li>
          <li><span>Strongest tenure</span><b>{[['Owned', model.current.ownedYoy], ['Rental', model.current.rentedYoy], ['Built for sale', model.current.builtForSaleYoy]].sort((a, b) => b[1] - a[1])[0][0]}</b></li>
          <li><span>Common comparison month</span><b>{monthLabel(model.commonMonth)}</b></li>
        </ul></div></aside>
      </div>
    </section>

    <section className={styles.section}>
      <header className={styles.sectionHeader}><div><span>02 / TENURE BREADTH</span><h2>Where construction demand is changing</h2></div><p>All lines are official year-over-year changes and use the same monthly reference points.</p></header>
      <article className={styles.panel}><div className={styles.panelHeading}><div><h3>Starts by tenure</h3><p>Year-over-year percent change · five-year window</p></div></div><div className={styles.chart}><Line data={model.categoryChart} options={options({ percent: true })} /></div></article>
    </section>

    <section className={styles.section}>
      <header className={styles.sectionHeader}><div><span>03 / RELEASE HISTORY</span><h2>Common-month scorecard</h2></div><p>Twelve latest common observations; no mixing of months across tenure categories.</p></header>
      <article className={styles.panel}><div className={styles.tableWrap}><table className={styles.matrix}>
        <thead><tr><th>Month</th><th>Total YoY</th><th>Owner-occupied</th><th>Rental</th><th>Built for sale</th></tr></thead>
        <tbody>{model.rows.map(row => <tr key={row.month}><td>{monthLabel(row.month)}</td><td>{pct(row.total)}</td><td>{pct(row.owned)}</td><td>{pct(row.rented)}</td><td>{pct(row.sale)}</td></tr>)}</tbody>
      </table></div></article>
    </section>

    <footer className={styles.methodology}><strong>Methodology.</strong> The headline is the MLIT seasonally adjusted annual rate. Tenure readings are official year-over-year rates for the latest month available across every category. This service uses the API feature of Statistics Dashboard, but the contents of this service are not guaranteed by the Statistics Bureau of Japan.{' '}<a href="https://dashboard.e-stat.go.jp/en/timeSeriesResult?indicatorCode=0802010103000010001" rel="noreferrer" target="_blank">Official series ↗</a></footer>
  </div></main>
}
