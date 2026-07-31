'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bar, Line } from 'react-chartjs-2'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import styles from './page.module.css'

ChartJS.register(
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
)

const COLORS = {
  headline: '#2774ae',
  core: '#d97706',
  servicesExShelter: '#188977',
  food: '#5c8fd6',
  energy: '#e2703a',
  coreGoods: '#91b982',
  coreServices: '#e5ad16',
}

const DETAIL_GROUPS = [
  {
    title: 'Core goods',
    keys: ['vehicles', 'usedCars', 'furnishings', 'apparel'],
  },
  {
    title: 'Core services',
    keys: ['rent', 'oer', 'medical', 'education', 'transportation'],
  },
]

const valid = value => Number.isFinite(value)
const signed = (value, digits = 1, suffix = '%') =>
  valid(value) ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}` : '—'
const percent = (value, digits = 1) => valid(value) ? `${value.toFixed(digits)}%` : '—'

function pointMap(series) {
  return new Map((series?.observations || []).map(point => [point.date, point.value]))
}

function latestValid(series) {
  const values = series?.observations || []
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (valid(values[index].value)) return values[index]
  }
  return null
}

function metrics(series) {
  const observations = series?.observations || []
  const latestIndex = observations.findLastIndex(point => valid(point.value))
  if (latestIndex < 0) return {}

  const latest = observations[latestIndex]
  const previous = observations[latestIndex - 1]
  const yearAgo = observations[latestIndex - 12]
  const threeMonthsAgo = observations[latestIndex - 3]

  const mom = valid(previous?.value)
    ? (latest.value / previous.value - 1) * 100
    : null
  const yoy = valid(yearAgo?.value)
    ? (latest.value / yearAgo.value - 1) * 100
    : null
  const annualized3m = valid(threeMonthsAgo?.value)
    ? ((latest.value / threeMonthsAgo.value) ** 4 - 1) * 100
    : null

  let previousYoy = null
  const previousYearAgo = observations[latestIndex - 13]
  if (valid(previous?.value) && valid(previousYearAgo?.value)) {
    previousYoy = (previous.value / previousYearAgo.value - 1) * 100
  }

  return {
    date: latest.date,
    mom,
    yoy,
    annualized3m,
    yoyChange: valid(yoy) && valid(previousYoy) ? yoy - previousYoy : null,
  }
}

function monthLabel(date, includeYear = false) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function KpiCard({ label, note, stats }) {
  return (
    <article className={styles.kpiCard}>
      <div className={styles.cardLabel}>{label}</div>
      <div className={styles.kpiTop}>
        <div className={styles.kpiValue}>{percent(stats.yoy)}</div>
        <div className={styles.kpiUnit}>Y/Y · {monthLabel(stats.date, true)}</div>
      </div>
      <div className={styles.metricRow}>
        <div><span>M/M</span><strong>{signed(stats.mom)}</strong></div>
        <div><span>3M ann.</span><strong>{percent(stats.annualized3m)}</strong></div>
        <div><span>Y/Y Δ</span><strong>{signed(stats.yoyChange, 1, 'pp')}</strong></div>
      </div>
      {note ? <div className={styles.panelSub} style={{ margin: '11px 0 0' }}>{note}</div> : null}
    </article>
  )
}

function chartOptions({ stacked = false, percentAxis = true } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, color: '#aab2b8', font: { size: 10 } },
      },
      tooltip: {
        backgroundColor: '#142b3c',
        padding: 10,
        callbacks: {
          label: context => `${context.dataset.label}: ${percent(context.parsed.y, 2)}`,
        },
      },
    },
    scales: {
      x: {
        stacked,
        grid: { display: false },
        ticks: { maxTicksLimit: 12, color: '#98a1a7', font: { size: 9 } },
      },
      y: {
        stacked,
        grid: { color: '#3a4044' },
        ticks: {
          color: '#98a1a7',
          font: { size: 9 },
          callback: value => percentAxis ? `${value}%` : value,
        },
      },
    },
  }
}

export default function USCpiDashboard() {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/us-cpi')
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load CPI data.')
        return body
      })
      .then(setPayload)
      .catch(fetchError => setError(fetchError.message))
  }, [])

  const model = useMemo(() => {
    if (!payload) return null
    const { series } = payload
    const headlineStats = metrics(series.headline)
    const coreStats = metrics(series.core)
    const servicesStats = metrics(series.servicesExShelter)

    const trendDates = series.headline.observations
      .filter(point => point.date >= '2021-01-01')
      .map(point => point.date)
    const toYoy = key => {
      const observations = series[key].observations
      const map = pointMap(series[key])
      return trendDates.map(date => {
        const current = map.get(date)
        const year = String(Number(date.slice(0, 4)) - 1)
        const prior = map.get(`${year}${date.slice(4)}`)
        return valid(current) && valid(prior) ? (current / prior - 1) * 100 : null
      })
    }

    const latestDates = trendDates.slice(-12)
    const contributionKeys = ['food', 'energy', 'coreGoods', 'coreServices']
    const contributions = Object.fromEntries(contributionKeys.map(key => {
      const map = pointMap(series[key])
      return [key, latestDates.map(date => {
        const current = map.get(date)
        const prior = map.get(`${Number(date.slice(0, 4)) - 1}${date.slice(4)}`)
        if (!valid(current) || !valid(prior)) return null
        return ((current / prior - 1) * 100) * payload.contributionWeights[key]
      })]
    }))

    const detailRows = DETAIL_GROUPS.flatMap(group => group.keys.map(key => ({
      group: group.title,
      key,
      series: series[key],
      stats: metrics(series[key]),
    })))

    const largestMover = [...detailRows]
      .filter(row => valid(row.stats.mom))
      .sort((a, b) => Math.abs(b.stats.mom) - Math.abs(a.stats.mom))[0]

    return {
      headlineStats,
      coreStats,
      servicesStats,
      largestMover,
      detailRows,
      trendData: {
        labels: trendDates.map(date => monthLabel(date, true)),
        datasets: [
          { label: 'Headline', data: toYoy('headline'), borderColor: COLORS.headline, backgroundColor: COLORS.headline, borderWidth: 2.3, pointRadius: 0, spanGaps: false },
          { label: 'Core', data: toYoy('core'), borderColor: COLORS.core, backgroundColor: COLORS.core, borderWidth: 2.3, pointRadius: 0, spanGaps: false },
          { label: 'Services ex Shelter', data: toYoy('servicesExShelter'), borderColor: COLORS.servicesExShelter, backgroundColor: COLORS.servicesExShelter, borderWidth: 2.3, pointRadius: 0, spanGaps: false },
        ],
      },
      contributionData: {
        labels: latestDates.map(date => monthLabel(date)),
        datasets: contributionKeys.map(key => ({
          label: series[key].label,
          data: contributions[key],
          backgroundColor: COLORS[key],
          borderWidth: 0,
          borderRadius: 2,
        })),
      },
    }
  }, [payload])

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          <div className={styles.stateCard}>
            <h1>CPI data is temporarily unavailable</h1>
            <p>{error} Check that FRED_API_KEY is configured in the deployment environment.</p>
          </div>
        </div>
      </main>
    )
  }

  if (!model) {
    return (
      <main className={styles.page}>
        <div className={styles.state}><div className={styles.stateCard}><h1>Loading US CPI…</h1><p>Fetching the latest seasonally adjusted series from FRED.</p></div></div>
      </main>
    )
  }

  const latestMonth = monthLabel(model.headlineStats.date, true)
  const cooling = model.headlineStats.yoyChange < 0

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <Link href="/">JapanPulse</Link> / <Link href="/us">US Macro</Link> / CPI
          </div>
          <Link className={styles.backLink} href="/us">← US dashboard</Link>
        </nav>

        <header className={styles.hero}>
          <div className={styles.eyebrow}>United States · Prices</div>
          <h1>Consumer Price Inflation</h1>
          <p>
            A high-signal view of headline, core and services inflation—built from seasonally
            adjusted BLS series delivered through FRED.
          </p>
          <div className={styles.heroMeta}>
            <span><i className={styles.statusDot} />Latest observation: {latestMonth}</span>
            <span>Monthly · Seasonally adjusted</span>
            <span>Updated {new Date(payload.fetchedAt).toLocaleString('en-US')}</span>
          </div>
        </header>

        <section className={styles.kpiGrid} aria-label="Latest CPI readings">
          <KpiCard label="Headline CPI" stats={model.headlineStats} />
          <KpiCard label="Core CPI" stats={model.coreStats} note="Excludes food and energy" />
          <KpiCard label="Services ex Shelter" stats={model.servicesStats} note="CPI supercore proxy; includes energy services" />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.sectionKicker}>Inflation pulse</div><h2>Direction and persistence</h2></div>
            <p>Year-over-year rates preserve the official October 2025 gap. The 2% line is a policy reference, not a CPI target.</p>
          </div>
          <div className={styles.twoCol}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Headline, core and services ex shelter</h3>
              <p className={styles.panelSub}>Year-over-year change · January 2021 to latest</p>
              <div className={styles.chart}>
                <Line
                  data={{
                    ...model.trendData,
                    datasets: [
                      ...model.trendData.datasets,
                      {
                        label: '2% reference',
                        data: model.trendData.labels.map(() => 2),
                        borderColor: '#626b71',
                        borderDash: [5, 5],
                        borderWidth: 1,
                        pointRadius: 0,
                      },
                    ],
                  }}
                  options={chartOptions()}
                />
              </div>
            </div>
            <aside className={styles.insight}>
              <h3>Latest read</h3>
              <ul className={styles.insightList}>
                <li>
                  <strong className={cooling ? styles.cool : styles.hot}>
                    Headline inflation is {cooling ? 'cooling' : 'accelerating'}
                  </strong>
                  <span>{signed(model.headlineStats.yoyChange, 1, 'pp')} versus the prior month on a year-over-year basis.</span>
                </li>
                <li>
                  <strong>Core momentum</strong>
                  <span>Core CPI is running at {percent(model.coreStats.annualized3m)} on a three-month annualized basis.</span>
                </li>
                <li>
                  <strong>Largest monthly mover</strong>
                  <span>{model.largestMover?.series.label}: {signed(model.largestMover?.stats.mom)} M/M.</span>
                </li>
                <li>
                  <strong>Services pulse</strong>
                  <span>The services-ex-shelter proxy is {percent(model.servicesStats.yoy)} Y/Y and {signed(model.servicesStats.mom)} M/M.</span>
                </li>
              </ul>
            </aside>
          </div>
          <div className={styles.notice}>
            <div className={styles.noticeIcon}>!</div>
            <div>
              <strong>October 2025 data gap</strong>
              <p>
                BLS did not publish the October 2025 CPI release because data collection was suspended
                during the lapse in federal appropriations. The gap is intentionally not interpolated.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div><div className={styles.sectionKicker}>Composition</div><h2>What is driving inflation?</h2></div>
            <p>Approximate contribution using December 2025 CPI-U relative-importance weights.</p>
          </div>
          <div className={styles.equalCol}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Contribution by major category</h3>
              <p className={styles.panelSub}>Percentage points to year-over-year CPI · approximate</p>
              <div className={styles.chartSmall}>
                <Bar data={model.contributionData} options={chartOptions({ stacked: true })} />
              </div>
            </div>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Category momentum</h3>
              <p className={styles.panelSub}>Latest M/M and Y/Y readings</p>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Series</th><th>M/M</th><th>3M ann.</th><th>Y/Y</th></tr></thead>
                  <tbody>
                    {model.detailRows.map(row => (
                      <tr key={row.key}>
                        <td>
                          <span className={styles.tableName}>{row.series.label}</span>
                          <span className={styles.seriesId}>{row.series.id}</span>
                        </td>
                        <td className={row.stats.mom >= 0 ? styles.positive : styles.negative}>{signed(row.stats.mom)}</td>
                        <td>{percent(row.stats.annualized3m)}</td>
                        <td>{percent(row.stats.yoy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <div>
            Source: <a className={styles.sourceLink} href="https://fred.stlouisfed.org/" target="_blank" rel="noreferrer">FRED</a>
            {' '}and U.S. Bureau of Labor Statistics. Values may be revised.
          </div>
          <div>Services ex Shelter is a CPI proxy, not the Federal Reserve&apos;s PCE supercore measure.</div>
        </footer>
      </div>
    </main>
  )
}
