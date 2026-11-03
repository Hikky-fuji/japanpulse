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
import { DashboardFreshness, DashboardState } from '../components/DashboardStatus'
import { wageRows } from '../lib/japan-wages.mjs'
import { SERIES_COLORS } from '../lib/series-colors.mjs'
import styles from '../us/analysis-dashboard.module.css'

ChartJS.register(CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip)

const INK = { muted: '#c7cdd1', grid: '#4a5258', zero: '#899197' }

const valid = value => Number.isFinite(value)
const pct = (value, digits = 1) => valid(value) ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}%` : '—'
const pt = (value, digits = 1) => valid(value) ? `${value > 0 ? '+' : ''}${value.toFixed(digits)} pt` : '—'
const monthLabel = date => {
  if (!date) return '—'
  const [year, month] = date.split('/').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function chartOptions(suffix = '%') {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: INK.muted, usePointStyle: true, pointStyle: 'circle', boxWidth: 8, font: { size: 10 } } },
      tooltip: {
        backgroundColor: '#142b3c',
        padding: 10,
        callbacks: { label: context => `${context.dataset.label}: ${valid(context.parsed.y) ? context.parsed.y.toFixed(1) : '—'}${suffix}` },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: INK.muted, maxTicksLimit: 12, font: { size: 9 } } },
      y: {
        grid: { color: context => context.tick.value === 0 ? INK.zero : INK.grid },
        ticks: { color: INK.muted, font: { size: 9 }, callback: value => `${value}${suffix}` },
      },
    },
  }
}

// Solid = same establishment (primary); dashed = all establishments (comparison).
function line(label, data, color, { dashed = false, width = 2 } = {}) {
  return { label, data, borderColor: color, backgroundColor: 'transparent', borderWidth: width, borderDash: dashed ? [5, 4] : [], pointRadius: 0, tension: .25, spanGaps: false }
}

function MetricCard({ label, value, period, rows, tone = '' }) {
  return (
    <article className={`${styles.metricCard} ${tone ? styles[tone] : ''}`}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricHeadline}>
        <strong>{value}</strong>
        <span>{period}</span>
      </div>
      <div className={styles.metricRows}>
        {rows.map(row => (
          <div key={row.label}><span>{row.label}</span><b>{row.value}</b></div>
        ))}
      </div>
    </article>
  )
}

export default function Wages() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/wages', { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || body.error) throw new Error(body.error || 'Unable to load wage data.')
        return body
      })
      .then(setData)
      .catch(fetchError => { if (fetchError.name !== 'AbortError') setError(fetchError.message) })
    return () => controller.abort()
  }, [])

  const model = useMemo(() => {
    if (!data?.nominal?.length) return null
    const rows = wageRows({
      nominal: data.nominal,
      real: data.real,
      scheduled: data.scheduled,
      nominalSame: data.nominal_same,
      scheduledSame: data.scheduled_same,
      scheduledFullTime: data.scheduled_same_fulltime,
      scheduledPartTime: data.scheduled_same_parttime,
    })
    const window24 = rows.slice(-24)
    const labels = window24.map(row => monthLabel(row.date))
    const series = key => window24.map(row => row[key])
    const latestSame = [...rows].reverse().find(row => valid(row.nominalSame)) || null
    const latestAll = [...rows].reverse().find(row => valid(row.nominal)) || null
    const ratios = (data.parttime_ratio || []).filter(item => valid(item.value))
    const latestRatio = ratios.at(-1) || null
    const ratioYearAgo = latestRatio && ratios.find(item => item.date === `${Number(latestRatio.date.slice(0, 4)) - 1}${latestRatio.date.slice(4)}`)
    const hasSame = Boolean(latestSame)

    return {
      rows,
      latestSame,
      latestAll,
      latestRatio,
      ratioChange: valid(ratioYearAgo?.value) ? latestRatio.value - ratioYearAgo.value : null,
      hasSame,
      tableRows: [...rows].reverse().filter(row => valid(row.nominal) || valid(row.nominalSame)).slice(0, 12),
      scheduledChart: {
        labels,
        datasets: [
          line('Scheduled · same establishment', series('scheduledSame'), SERIES_COLORS.scheduledWages, { width: 2.4 }),
          line('Scheduled · all establishments', series('scheduled'), SERIES_COLORS.scheduledWages, { dashed: true, width: 1.6 }),
        ],
      },
      totalChart: {
        labels,
        datasets: [
          line('Total cash earnings · same establishment', series('nominalSame'), SERIES_COLORS.wages, { width: 2.4 }),
          line('Total cash earnings · all establishments', series('nominal'), SERIES_COLORS.wages, { dashed: true, width: 1.6 }),
          line('Real · same establishment (derived)', series('realSame'), SERIES_COLORS.realWages, { width: 2.2 }),
          line('Real · all establishments (official)', series('real'), SERIES_COLORS.realWages, { dashed: true, width: 1.6 }),
        ],
      },
      compositionChart: {
        labels,
        datasets: [
          line('Full-time scheduled · same establishment', series('scheduledFullTime'), SERIES_COLORS.wages),
          line('Part-time scheduled · same establishment', series('scheduledPartTime'), SERIES_COLORS.realWages),
        ],
      },
      ratioChart: {
        labels: (data.parttime_ratio || []).slice(-24).map(item => monthLabel(item.date)),
        datasets: [line('Part-time share of employees', (data.parttime_ratio || []).slice(-24).map(item => item.value), SERIES_COLORS.scheduledWages)],
      },
    }
  }, [data])

  if (error) return <main className={styles.page}><div className={styles.error}>{error}</div></main>
  if (!model) return <DashboardState />

  const { latestSame, latestAll, latestRatio, ratioChange } = model
  const warnings = data.meta?.warnings || []

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DashboardFreshness data={data} source="MHLW · Monthly Labour Survey" />
        <nav className={styles.topbar}>
          <Link href="/#japan">← Japan Macro Dashboard</Link>
          <span>WAGES / MONTHLY LABOUR SURVEY</span>
        </nav>

        <header className={styles.hero}>
          <div className={styles.eyebrow}>JAPAN / 毎月勤労統計</div>
          <h1>Wages: Same-Establishment Basis</h1>
          <p>
            Same-establishment (共通事業所) growth strips out the January sample rotation that distorts the headline
            all-establishment rates, so it is the primary basis here; all establishments are shown dashed for comparison.
          </p>
          <div className={styles.heroMeta}>
            <span><i />Auto-updated from MHLW workbooks</span>
            <span>Same establishment through {monthLabel(data.latest_same_date)}</span>
            <span>All establishments through {monthLabel(data.latest_date)}</span>
          </div>
        </header>

        {warnings.length > 0 && (
          <article className={styles.panel} role="status">
            <p className={styles.panelNote}>Partial data: {warnings.join(' · ')}</p>
          </article>
        )}

        <section className={styles.metricGridFive}>
          <MetricCard label="Scheduled earnings" value={pct(latestSame?.scheduledSame)} period={`Y/Y · same est. · ${monthLabel(latestSame?.date)}`} tone="positive" rows={[
            { label: 'All establishments', value: pct(latestSame?.scheduled) },
            { label: 'Full-time (same est.)', value: pct(latestSame?.scheduledFullTime) },
          ]} />
          <MetricCard label="Total cash earnings" value={pct(latestSame?.nominalSame)} period={`Y/Y · same est. · ${monthLabel(latestSame?.date)}`} tone="headline" rows={[
            { label: 'All establishments', value: pct(latestSame?.nominal) },
            { label: 'Sample gap (all − same)', value: pt(latestSame?.sampleGap) },
          ]} />
          <MetricCard label="Real wages (official)" value={pct(latestAll?.real)} period={`Y/Y · all est. · ${monthLabel(latestAll?.date)}`} tone={valid(latestAll?.real) && latestAll.real < 0 ? 'negative' : 'positive'} rows={[
            { label: 'Same est. (derived)', value: pct(latestSame?.realSame) },
            { label: 'Implied deflator', value: pct(latestSame?.deflator) },
          ]} />
          <MetricCard label="Part-time wages" value={pct(latestSame?.scheduledPartTime)} period={`Scheduled Y/Y · same est. · ${monthLabel(latestSame?.date)}`} rows={[
            { label: 'Full-time', value: pct(latestSame?.scheduledFullTime) },
            { label: 'Gap (part − full)', value: pt(valid(latestSame?.scheduledPartTime) && valid(latestSame?.scheduledFullTime) ? latestSame.scheduledPartTime - latestSame.scheduledFullTime : null) },
          ]} />
          <MetricCard label="Part-time share" value={valid(latestRatio?.value) ? `${latestRatio.value.toFixed(1)}%` : '—'} period={`of employees · ${monthLabel(latestRatio?.date)}`} rows={[
            { label: 'vs 12 months ago', value: pt(ratioChange) },
            { label: 'Basis', value: 'All establishments' },
          ]} />
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>01 / BASE PAY</span><h2>Scheduled earnings, the BOJ&apos;s wage anchor</h2></div>
            <p>Scheduled (所定内) pay excludes overtime and bonuses, so it tracks base-pay settlements more closely than total earnings.</p>
          </header>
          <div className={styles.equalGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}><div><h3>Scheduled earnings</h3><p>Y/Y % · solid = same establishment · dashed = all establishments · 24 months</p></div></div>
              <div className={styles.chartSmall}><Line data={model.scheduledChart} options={chartOptions()} /></div>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelHeading}><div><h3>Full-time vs part-time</h3><p>Scheduled earnings Y/Y % · same establishment</p></div></div>
              <div className={styles.chartSmall}><Line data={model.compositionChart} options={chartOptions()} /></div>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>02 / TOTAL &amp; REAL</span><h2>Total cash earnings and purchasing power</h2></div>
            <p>Bonuses make total earnings jumpy in June–July and December. Real wages are MHLW&apos;s official all-establishment series.</p>
          </header>
          <div className={styles.mainGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>Nominal and real wages</h3><p>Y/Y % · solid = same establishment · dashed = all establishments</p></div>
                <span className={styles.tag}>Same-est. real is derived</span>
              </div>
              <div className={styles.chart}><Line data={model.totalChart} options={chartOptions()} /></div>
            </article>
            <aside className={styles.analysis}>
              <div>
                <div className={styles.analysisKicker}>LATEST · {monthLabel(latestSame?.date)}</div>
                <div className={styles.analysisScore}>
                  <div><strong>{pct(latestSame?.nominalSame)}</strong><small>Total cash earnings, same establishment</small></div>
                </div>
                <ul>
                  <li><span>All establishments<small>Headline basis</small></span><b>{pct(latestSame?.nominal)}</b></li>
                  <li><span>Sample gap (all − same)<small>Rotation / composition effect</small></span><b>{pt(latestSame?.sampleGap)}</b></li>
                  <li><span>Implied CPI deflator<small>From MHLW nominal and real</small></span><b>{pct(latestSame?.deflator)}</b></li>
                  <li><span>Real, same establishment<small>Derived proxy, ±0.1 pt rounding</small></span><b className={valid(latestSame?.realSame) && latestSame.realSame < 0 ? styles.negativeText : styles.positiveText}>{pct(latestSame?.realSame)}</b></li>
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>03 / MONTHLY TABLE</span><h2>Latest twelve months</h2></div>
            <p>Y/Y %. The all-establishment month can run one month ahead of the same-establishment workbook.</p>
          </header>
          <div className={styles.equalGrid}>
            <article className={styles.panel}>
              <div className={styles.tableWrap}>
                <table className={styles.matrix}>
                  <thead>
                    <tr><th>Month</th><th>Scheduled · same</th><th>Scheduled · all</th><th>Total · same</th><th>Total · all</th><th>Real · official</th><th>Real · same (derived)</th></tr>
                  </thead>
                  <tbody>
                    {model.tableRows.map(row => (
                      <tr key={row.date}>
                        <td>{monthLabel(row.date)}</td>
                        <td><b>{pct(row.scheduledSame)}</b></td>
                        <td>{pct(row.scheduled)}</td>
                        <td><b>{pct(row.nominalSame)}</b></td>
                        <td>{pct(row.nominal)}</td>
                        <td className={valid(row.real) && row.real < 0 ? styles.negativeText : undefined}>{pct(row.real)}</td>
                        <td>{pct(row.realSame)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelHeading}><div><h3>Part-time share of employees</h3><p>% · all establishments · 24 months</p></div></div>
              <div className={styles.chartSmall}><Line data={model.ratioChart} options={chartOptions()} /></div>
            </article>
          </div>
        </section>

        <footer className={styles.methodology}>
          <strong>Methodology.</strong> MHLW rotates part of the Monthly Labour Survey sample each January, which creates breaks in
          the headline (all-establishment) year-over-year rates. MHLW therefore also publishes nominal year-over-year rates for
          establishments sampled in both years (共通事業所), which this page treats as the primary basis. MHLW does not publish a
          same-establishment real wage: the &quot;derived&quot; series divides same-establishment nominal growth by the CPI deflator
          implied by MHLW&apos;s own all-establishment nominal and real rates for the same month. It is a proxy with roughly ±0.1 pt of
          rounding, not an official statistic. Sources:{' '}
          <a href="https://www.mhlw.go.jp/toukei/list/30-1.html" target="_blank" rel="noreferrer">MHLW Monthly Labour Survey</a>
          {' '}(tables t01, t04, t06 and the 共通事業所 reference workbook).
        </footer>
      </div>
    </main>
  )
}
