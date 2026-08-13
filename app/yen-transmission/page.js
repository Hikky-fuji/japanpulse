'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import styles from '../us/analysis-dashboard.module.css'

ChartJS.register(CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)

const COLORS = {
  orange: '#f08a24',
  blue: '#42a9bc',
  green: '#60d4af',
  red: '#ff6b6b',
  violet: '#a99af0',
  muted: '#c7cdd1',
  grid: '#4a5258',
}

const finite = value => Number.isFinite(value)
const last = series => Array.isArray(series) && series.length ? series.at(-1) : null
const clean = series => (series || []).filter(point => finite(point?.value))

function signed(value, digits = 1, suffix = '') {
  if (!finite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`
}

function fixed(value, digits = 1, suffix = '') {
  return finite(value) ? `${value.toFixed(digits)}${suffix}` : '—'
}

function dateLabel(value, monthly = false) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    ...(monthly ? {} : { day: 'numeric' }),
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`))
}

function yearAgoValue(series, current) {
  if (!current?.date) return null
  const target = `${Number(current.date.slice(0, 4)) - 1}${current.date.slice(4, 7)}`
  return series.find(item => item.date.slice(0, 7) === target)?.value ?? null
}

function yoySeries(series) {
  const values = clean(series)
  return values.map(item => {
    const prior = yearAgoValue(values, item)
    return finite(prior) && prior !== 0
      ? { date: item.date, value: (item.value / prior - 1) * 100 }
      : null
  }).filter(Boolean)
}

function monthlyLast(series) {
  const months = new Map()
  for (const item of clean(series)) months.set(item.date.slice(0, 7), item)
  return [...months.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function nearest(series, dates) {
  const map = new Map(series.map(item => [item.date.slice(0, 7), item.value]))
  return dates.map(date => map.get(date) ?? null)
}

function baseOptions({ percentAxis = false, zeroLine = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: COLORS.muted, usePointStyle: true, boxWidth: 8, font: { size: 10 } } },
      tooltip: {
        backgroundColor: '#142b3c',
        padding: 10,
        callbacks: { label: context => `${context.dataset.label}: ${finite(context.parsed.y) ? context.parsed.y.toFixed(2) : '—'}${percentAxis ? '%' : ''}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: COLORS.muted, maxTicksLimit: 10, font: { size: 9 } } },
      y: {
        grid: { color: context => zeroLine && context.tick.value === 0 ? '#8c969d' : COLORS.grid },
        ticks: { color: COLORS.muted, font: { size: 9 }, callback: value => `${value}${percentAxis ? '%' : ''}` },
      },
    },
  }
}

function MetricCard({ label, value, period, rows, tone = 'neutral' }) {
  return (
    <article className={`${styles.metricCard} ${styles[tone] || ''}`}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricHeadline}><strong>{value}</strong><span>{period}</span></div>
      <div className={styles.metricRows}>
        {rows.map(row => <div key={row.label}><span>{row.label}</span><b>{row.value}</b></div>)}
      </div>
    </article>
  )
}

function transmissionRegime({ usdThreeMonth, neerYoy, importYoy, coreCpi }) {
  const signals = [
    {
      label: 'Bilateral yen impulse',
      detail: `${signed(usdThreeMonth, 1, '%')} · USD/JPY over three months`,
      value: finite(usdThreeMonth) ? usdThreeMonth > 3 ? 'Yen depreciation' : usdThreeMonth < -3 ? 'Yen appreciation' : 'Limited move' : 'Awaiting data',
      tone: finite(usdThreeMonth) && usdThreeMonth > 3 ? 'warningText' : finite(usdThreeMonth) && usdThreeMonth < -3 ? 'positiveText' : 'neutralText',
    },
    {
      label: 'Trade-weighted yen',
      detail: `${signed(neerYoy, 1, '%')} · NEER year over year`,
      value: finite(neerYoy) ? neerYoy < -3 ? 'Broad depreciation' : neerYoy > 3 ? 'Broad appreciation' : 'Broadly stable' : 'Awaiting data',
      tone: finite(neerYoy) && neerYoy < -3 ? 'warningText' : finite(neerYoy) && neerYoy > 3 ? 'positiveText' : 'neutralText',
    },
    {
      label: 'Imported cost impulse',
      detail: `${signed(importYoy, 1, '%')} · import price index YoY`,
      value: finite(importYoy) ? importYoy > 2 ? 'Upstream pressure' : importYoy < -2 ? 'Upstream relief' : 'Limited impulse' : 'Awaiting data',
      tone: finite(importYoy) && importYoy > 2 ? 'negativeText' : finite(importYoy) && importYoy < -2 ? 'positiveText' : 'neutralText',
    },
    {
      label: 'Consumer-price outcome',
      detail: `${fixed(coreCpi, 1, '%')} · national core CPI YoY`,
      value: finite(coreCpi) ? coreCpi > 2.5 ? 'Above target pace' : coreCpi < 1.5 ? 'Subdued pace' : 'Near target range' : 'Awaiting data',
      tone: finite(coreCpi) && coreCpi > 2.5 ? 'warningText' : 'neutralText',
    },
  ]

  const label = finite(usdThreeMonth) && usdThreeMonth > 3 && finite(importYoy) && importYoy > 2
    ? 'Depreciation pass-through active'
    : finite(usdThreeMonth) && usdThreeMonth < -3 && finite(importYoy) && importYoy < 0
      ? 'External cost relief building'
      : 'Mixed external-price transmission'
  return { label, signals }
}

export default function YenTransmissionDashboard() {
  const [bundle, setBundle] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([
      fetch('/api/yen-transmission', { signal: controller.signal }).then(async response => {
        const body = await response.json()
        if (!response.ok || body.error) throw new Error(body.error || 'Yen data unavailable')
        return body
      }),
      fetch('/api/ppi', { signal: controller.signal }).then(response => response.ok ? response.json() : null),
      fetch('/api/cpi', { signal: controller.signal }).then(response => response.ok ? response.json() : null),
    ]).then(([yen, ppi, cpi]) => {
      if (yen.status !== 'fulfilled') throw yen.reason
      setBundle({
        yen: yen.value,
        ppi: ppi.status === 'fulfilled' ? ppi.value : null,
        cpi: cpi.status === 'fulfilled' ? cpi.value : null,
      })
    }).catch(fetchError => {
      if (fetchError.name !== 'AbortError') setError(fetchError.message)
    })
    return () => controller.abort()
  }, [])

  const model = useMemo(() => {
    if (!bundle) return null
    const usdMonthly = monthlyLast(bundle.yen.series.usdJpy)
    const callMonthly = monthlyLast(bundle.yen.series.callRate)
    const neer = clean(bundle.yen.series.neer)
    const reer = clean(bundle.yen.series.reer)
    const usdYoy = yoySeries(usdMonthly)
    const importYoy = yoySeries(bundle.ppi?.import_ppi)
    const cgpiYoy = yoySeries(bundle.ppi?.cgpi)
    const core = clean(bundle.cpi?.core)
    const dates = [...new Set([
      ...usdYoy.map(item => item.date.slice(0, 7)),
      ...importYoy.map(item => item.date.slice(0, 7)),
      ...core.map(item => item.date.slice(0, 7)),
    ])].sort().slice(-36)
    const latestImportYoy = last(importYoy)?.value
    const latestCore = last(core)?.value
    const latestNeerYoy = last(yoySeries(neer))?.value
    const latestReerYoy = last(yoySeries(reer))?.value
    const latest = bundle.yen.latest
    return {
      ...bundle,
      usdMonthly,
      callMonthly,
      neer,
      reer,
      usdYoy,
      importYoy,
      cgpiYoy,
      core,
      dates,
      latestImportYoy,
      latestCore,
      latestNeerYoy,
      latestReerYoy,
      regime: transmissionRegime({
        usdThreeMonth: latest.changes.usdJpyThreeMonthPct,
        neerYoy: latestNeerYoy,
        importYoy: latestImportYoy,
        coreCpi: latestCore,
      }),
    }
  }, [bundle])

  if (error) return <main className={styles.error}><strong>Yen transmission data unavailable</strong><p>{error}</p></main>
  if (!model) return <main className={styles.loading}>Loading BOJ market and price data…</main>

  const latest = model.yen.latest
  const monthLabels = values => values.map(item => dateLabel(item.date, true))

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <Link href="/">← Japan workspace</Link>
          <span>Bank of Japan / MIC via official APIs</span>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>JP / YEN &amp; EXTERNAL COSTS / ★★★ CORE</div>
          <h1>Yen &amp; External Cost Transmission</h1>
          <p>
            Connect bilateral and trade-weighted yen moves to import prices and domestic inflation,
            while keeping market impulses separate from measured outcomes.
          </p>
          <div className={styles.heroMeta}>
            <span><i />Updated automatically</span>
            <span>Latest USD/JPY · {dateLabel(latest.usdJpy?.date)}</span>
            <span>Daily markets · monthly price transmission</span>
          </div>
        </section>

        <section className={styles.metricGridFive} aria-label="Latest yen and price transmission readings">
          <MetricCard
            label="USD / JPY"
            value={fixed(latest.usdJpy?.value, 2)}
            period={dateLabel(latest.usdJpy?.date)}
            rows={[
              { label: '1-month move', value: signed(latest.changes.usdJpyOneMonthPct, 1, '%') },
              { label: '3-month move', value: signed(latest.changes.usdJpyThreeMonthPct, 1, '%') },
            ]}
            tone={latest.changes.usdJpyThreeMonthPct > 3 ? 'warning' : 'neutral'}
          />
          <MetricCard
            label="Nominal Effective Yen"
            value={fixed(latest.neer?.value, 1)}
            period={dateLabel(latest.neer?.date, true)}
            rows={[
              { label: 'Year-over-year', value: signed(model.latestNeerYoy, 1, '%') },
              { label: 'Direction', value: model.latestNeerYoy < 0 ? 'Depreciation' : 'Appreciation' },
            ]}
          />
          <MetricCard
            label="Real Effective Yen"
            value={fixed(latest.reer?.value, 1)}
            period={dateLabel(latest.reer?.date, true)}
            rows={[
              { label: 'Year-over-year', value: signed(model.latestReerYoy, 1, '%') },
              { label: 'Vs 2020 average', value: signed(latest.reer?.value - 100, 1) },
            ]}
            tone={latest.reer?.value < 80 ? 'warning' : 'neutral'}
          />
          <MetricCard
            label="Import Price Index"
            value={signed(model.latestImportYoy, 1, '%')}
            period={dateLabel(last(model.importYoy)?.date, true)}
            rows={[
              { label: 'National core CPI', value: fixed(model.latestCore, 1, '%') },
              { label: 'CGPI', value: signed(last(model.cgpiYoy)?.value, 1, '%') },
            ]}
            tone={model.latestImportYoy > 2 ? 'negative' : model.latestImportYoy < -2 ? 'positive' : 'neutral'}
          />
          <MetricCard
            label="Uncollateralized Call"
            value={fixed(latest.callRate?.value, 3, '%')}
            period={dateLabel(latest.callRate?.date)}
            rows={[
              { label: '1-month change', value: signed(latest.changes.callRateOneMonthBp, 0, 'bp') },
              { label: 'Frequency', value: 'Daily average' },
            ]}
            tone="violet"
          />
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>01 / TRANSMISSION REGIME</span><h2>{model.regime.label}</h2></div>
            <p>Direction is assessed mechanically from recent moves; it is descriptive, not a causal estimate or forecast.</p>
          </header>
          <div className={styles.mainGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>FX and imported inflation impulse</h3><p>Positive USD/JPY growth means yen depreciation</p></div>
                <b className={styles.tag}>YoY %</b>
              </div>
              <div className={styles.chart}>
                <Line
                  data={{ labels: model.dates, datasets: [
                    { label: 'USD/JPY', data: nearest(model.usdYoy, model.dates), borderColor: COLORS.orange, borderWidth: 2.2, pointRadius: 0, tension: 0.18 },
                    { label: 'Import prices', data: nearest(model.importYoy, model.dates), borderColor: COLORS.red, borderWidth: 2, pointRadius: 0, tension: 0.18 },
                  ] }}
                  options={baseOptions({ percentAxis: true, zeroLine: true })}
                />
              </div>
            </article>
            <article className={styles.analysis}>
              <div>
                <div className={styles.analysisKicker}>PASS-THROUGH MATRIX</div>
                <div className={styles.analysisScore}><div><strong>{model.regime.label}</strong><small>Signals can diverge because lags and other costs matter</small></div></div>
                <ul>{model.regime.signals.map(signal => (
                  <li key={signal.label}>
                    <span>{signal.label}<small>{signal.detail}</small></span>
                    <b className={styles[signal.tone]}>{signal.value}</b>
                  </li>
                ))}</ul>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>02 / EFFECTIVE EXCHANGE RATE</span><h2>Is the yen move broad or bilateral?</h2></div>
            <p>NEER captures trade-weighted nominal moves; REER also adjusts for relative prices. Higher index values mean appreciation.</p>
          </header>
          <div className={styles.panel}><div className={styles.chartSmall}>
            <Line data={{ labels: monthLabels(model.neer), datasets: [
              { label: 'Nominal effective yen', data: model.neer.map(item => item.value), borderColor: COLORS.blue, borderWidth: 2, pointRadius: 0, tension: 0.18 },
              { label: 'Real effective yen', data: model.reer.map(item => item.value), borderColor: COLORS.violet, borderWidth: 2, pointRadius: 0, tension: 0.18 },
            ] }} options={baseOptions()} />
          </div></div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>03 / PRICE PIPELINE</span><h2>Upstream pressure versus consumer prices</h2></div>
            <p>Import prices can pass through with variable lags and are also influenced by commodity prices and contract currency.</p>
          </header>
          <div className={styles.panel}><div className={styles.chartSmall}>
            <Line data={{ labels: model.dates, datasets: [
              { label: 'Import prices', data: nearest(model.importYoy, model.dates), borderColor: COLORS.red, borderWidth: 2, pointRadius: 0, tension: 0.18 },
              { label: 'Domestic CGPI', data: nearest(model.cgpiYoy, model.dates), borderColor: COLORS.orange, borderWidth: 2, pointRadius: 0, tension: 0.18 },
              { label: 'National core CPI', data: nearest(model.core, model.dates), borderColor: COLORS.green, borderWidth: 2.2, pointRadius: 0, tension: 0.18 },
            ] }} options={baseOptions({ percentAxis: true, zeroLine: true })} />
          </div></div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>04 / POLICY ANCHOR</span><h2>Overnight call rate</h2></div>
            <p>The daily uncollateralized overnight call rate is the realized money-market anchor, not the announced policy wording itself.</p>
          </header>
          <div className={styles.panel}><div className={styles.chartSmall}>
            <Line data={{ labels: monthLabels(model.callMonthly), datasets: [
              { label: 'Uncollateralized overnight call rate', data: model.callMonthly.map(item => item.value), borderColor: COLORS.violet, backgroundColor: 'rgba(169,154,240,.10)', borderWidth: 2.2, pointRadius: 0, tension: 0.15, fill: true },
            ] }} options={baseOptions({ percentAxis: true, zeroLine: true })} />
          </div></div>
        </section>

        <div className={styles.methodology}>
          <strong>Methodology &amp; source discipline.</strong>{' '}
          USD/JPY, the nominal and real effective exchange-rate indices, and the overnight call rate come from the BOJ Time-Series Data Search API.
          Import prices and CGPI use BOJ 2020-base indices; national core CPI comes from MIC via e-Stat. Year-over-year rates are calculated from published index levels.
          Co-movement does not establish exchange-rate pass-through causality.
          {' '}<a href="https://www.stat-search.boj.or.jp/index_en.html" rel="noreferrer" target="_blank">BOJ data search ↗</a>
          {' · '}<Link href="/boj-policy">BOJ policy monitor →</Link>
        </div>
      </div>
    </main>
  )
}
