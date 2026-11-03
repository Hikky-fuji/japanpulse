'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DashboardFreshness } from '../../components/DashboardStatus'
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
import styles from './page.module.css'
import {
  COMPOSITE_DISTRICTS,
  EARLY_READ_DISTRICTS,
  ISM_EQUIVALENT_COMPONENTS,
  ISM_EQUIVALENT_VALIDATION,
  componentSeries,
  districtComponent,
  districtComposite,
  ismEquivalent,
  ismEquivalentComposite,
  movingAverage,
  spreadSeries,
  trackingStats,
} from '../../lib/regional-ism.mjs'
import { regionalReleaseDate } from '../../lib/regional-surveys.mjs'
import { SERIES_COLORS } from '../../lib/series-colors.mjs'

ChartJS.register(
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
)

// Shared indicator colors (app/lib/series-colors.mjs).
const COLORS = {
  empire: SERIES_COLORS.empire,
  philly: SERIES_COLORS.philly,
  richmond: SERIES_COLORS.richmond,
  dallas: SERIES_COLORS.dallas,
  regional: SERIES_COLORS.regionalComposite,
  ism: SERIES_COLORS.ism,
  muted: '#c7cdd1',
  grid: '#4a5258',
}

const PRICE_DISTRICTS = ['empire', 'philly', 'dallas']
const OUTLOOK_DISTRICTS = ['empire', 'philly', 'dallas']
const DISTRICT_LABELS = { empire: 'NY', philly: 'Philly', richmond: 'Richmond', dallas: 'Dallas' }

const STAGE_NAMES = {
  empire: 'New York Empire',
  philly: 'Philadelphia Fed',
  richmond: 'Richmond Fed',
  dallas: 'Dallas Fed',
  ism: 'ISM Manufacturing',
}

const DISTRICTS = [
  { key: 'empire', label: 'NY' },
  { key: 'philly', label: 'Philly' },
  { key: 'richmond', label: 'Richmond' },
  { key: 'dallas', label: 'Dallas' },
]

const valid = value => Number.isFinite(value)
const last = values => values?.length ? values[values.length - 1] : null
const signed = (value, digits = 1) => valid(value) ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}` : '—'
const monthLabel = date => date
  ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${date}T00:00:00Z`))
  : '—'


function latestByMonth(observations) {
  return new Map(
    (observations || [])
      .filter(point => valid(point.value))
      .map(point => [point.date.slice(0, 7), point.value]),
  )
}


function pointForMonth(observations, month) {
  if (!month) return null
  return last((observations || []).filter(point => point.date.slice(0, 7) === month))
}

function releaseDates(referenceDate) {
  if (!referenceDate) return {}
  const [year, month] = referenceDate.slice(0, 7).split('-').map(Number)
  const releases = Object.fromEntries(['empire', 'philly', 'richmond', 'dallas']
    .map(key => [key, regionalReleaseDate(key, year, month - 1)]))
  // ISM: first business day of the following month.
  const ism = new Date(Date.UTC(year, month, 1))
  while (ism.getUTCDay() === 0 || ism.getUTCDay() === 6) ism.setUTCDate(ism.getUTCDate() + 1)
  return { ...releases, ism }
}

const addMonth = (date, delta) => {
  const [year, month] = date.slice(0, 7).split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`
}

const formatRelease = date => date
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date)
  : null

// Release order for the reference month: Richmond's fourth Tuesday and
// Dallas's last Monday swap places from month to month.
function orderedCadence(cadence = [], releases = {}) {
  return [...cadence]
    .sort((a, b) => (releases[a.key]?.getTime() ?? Infinity) - (releases[b.key]?.getTime() ?? Infinity))
    .map((stage, index) => ({ ...stage, sequence: index + 1 }))
}

function signalFor(value, neutral = 0) {
  if (!valid(value)) return { label: 'No data', tone: 'neutral' }
  const distance = value - neutral
  if (distance >= 5) return { label: 'Expansion', tone: 'positive' }
  if (distance > 0) return { label: 'Slight expansion', tone: 'positive' }
  if (distance <= -5) return { label: 'Contraction', tone: 'negative' }
  if (distance < 0) return { label: 'Slight contraction', tone: 'negative' }
  return { label: 'Neutral', tone: 'neutral' }
}

function SurveyCard({ label, role, importance, value, date, change, color, description, rows = [] }) {
  const signal = signalFor(value, 50)
  return (
    <article className={styles.surveyCard} style={{ '--accent': color }}>
      <div className={styles.cardTopline}>
        <span>{role}</span>
        <b>{importance}</b>
      </div>
      <h3>{label}</h3>
      <p>{description}</p>
      <div className={styles.cardValue}>
        <strong>{valid(value) ? value.toFixed(1) : '—'}</strong>
        <div>
          <span className={styles[signal.tone]}>{signal.label}</span>
          <small>{monthLabel(date)}</small>
        </div>
      </div>
      {rows.map(row => (
        <div className={styles.cardFooter} key={row.label}>
          <span>{row.label}</span>
          <b>{row.value}</b>
        </div>
      ))}
      <div className={styles.cardFooter}>
        <span>1M change</span>
        <b className={toneClass(change, 0)}>{signed(change)} pt</b>
      </div>
    </article>
  )
}

function toneClass(value, neutral) {
  if (!valid(value) || value === neutral) return undefined
  return value > neutral ? styles.positive : styles.negative
}

function chartOptions({ neutralLabel = 'Neutral', baseline = 0 } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: COLORS.muted,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          font: { size: 10 },
        },
      },
      tooltip: {
        backgroundColor: '#142b3c',
        padding: 10,
        callbacks: {
          label: context => `${context.dataset.label}: ${baseline ? context.parsed.y?.toFixed(1) ?? '—' : signed(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: COLORS.muted, maxTicksLimit: 12, font: { size: 9 } },
      },
      y: {
        grid: {
          color: context => context.tick.value === baseline ? '#899197' : COLORS.grid,
          lineWidth: context => context.tick.value === baseline ? 1.5 : 1,
        },
        ticks: { color: COLORS.muted, font: { size: 9 } },
        title: {
          display: true,
          text: neutralLabel,
          color: COLORS.muted,
          font: { size: 9 },
        },
      },
    },
  }
}

export default function ManufacturingMomentumPage() {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/us-manufacturing', { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || body.error) throw new Error(body.error || 'Unable to load manufacturing data.')
        return body
      })
      .then(setPayload)
      .catch(fetchError => {
        if (fetchError.name !== 'AbortError') setError(fetchError.message)
      })
    return () => controller.abort()
  }, [])

  const model = useMemo(() => {
    if (!payload) return null

    const empire = payload.regional.empire.series
    const philly = payload.regional.philly.series
    const empireHeadline = empire.headline.observations.filter(point => valid(point.value))
    const phillyHeadline = philly.headline.observations.filter(point => valid(point.value))
    const ismHeadline = payload.ism.headline.filter(point => valid(point.value))
    const empireLatest = last(empireHeadline)
    const phillyLatest = last(phillyHeadline)
    const ismLatest = last(ismHeadline)
    const referenceDate = [empireLatest?.date, phillyLatest?.date].filter(Boolean).sort().at(-1)
    const releases = releaseDates(referenceDate)

    const start = empireHeadline.at(-36)?.date?.slice(0, 7) || '2023-01'
    const months = [...new Set([
      ...empireHeadline.map(point => point.date.slice(0, 7)),
      ...phillyHeadline.map(point => point.date.slice(0, 7)),
      ...ismHeadline.map(point => point.date.slice(0, 7)),
    ])].filter(month => month >= start).sort()
    const empireMap = latestByMonth(empireHeadline)
    const phillyMap = latestByMonth(phillyHeadline)
    const ismMap = latestByMonth(ismHeadline)
    const comparisonMonth = months
      .filter(month => empireMap.has(month) && phillyMap.has(month) && ismMap.has(month))
      .at(-1) || [empireLatest, phillyLatest, ismLatest]
        .filter(Boolean)
        .map(point => point.date.slice(0, 7))
        .sort()
        .at(0)

    const regional = payload.regional
    const districts = DISTRICTS.filter(district => regional[district.key])
    const eqMaps = Object.fromEntries(districts.map(district => [
      district.key,
      latestByMonth(ismEquivalentComposite(regional[district.key].series)),
    ]))
    const earlyRead = districtComposite(regional, EARLY_READ_DISTRICTS)
    const fourDistrict = districts.length === COMPOSITE_DISTRICTS.length ? districtComposite(regional, COMPOSITE_DISTRICTS) : []
    const earlyMap = latestByMonth(earlyRead)
    const fourMap = latestByMonth(fourDistrict)
    const headlineComposite = fourDistrict.length ? fourDistrict : earlyRead
    const liveStats = trackingStats(headlineComposite, ismHeadline)
    const fourLatest = last(fourDistrict)
    const earlyLatest = last(earlyRead)
    const earlyAhead = earlyLatest && (!fourLatest || earlyLatest.date > fourLatest.date)
    const change1m = (series, point) => {
      const previous = point && series.find(item => item.date.slice(0, 7) === addMonth(point.date, -1))
      return valid(point?.value) && valid(previous?.value) ? point.value - previous.value : null
    }
    const latestReleases = [
      ...districts.map(district => {
        const headline = (regional[district.key].series.headline?.observations || []).filter(point => valid(point.value))
        const point = last(headline)
        return {
          key: district.key,
          label: STAGE_NAMES[district.key],
          date: point?.date,
          value: eqMaps[district.key].get(point?.date?.slice(0, 7)),
          detail: `Headline ${signed(point?.value)} DI`,
        }
      }),
      { key: 'ism', label: STAGE_NAMES.ism, date: ismLatest?.date, value: ismLatest?.value, detail: 'Official PMI' },
    ]
    const regionalSignal = signalFor((fourLatest || earlyLatest)?.value, 50)
    const regionalChange = fourLatest ? change1m(fourDistrict, fourLatest) : change1m(earlyRead, earlyLatest)
    const readoutLabel = !regionalSignal || regionalSignal.tone === 'neutral'
      ? 'Regional breadth is unavailable'
      : `Regional breadth: ${regionalSignal.label.toLowerCase()}${valid(regionalChange) ? (regionalChange > 0.25 ? ', firming' : regionalChange < -0.25 ? ', cooling' : ', steady') : ''}`
    const trackingMonths = [...new Set([...earlyMap.keys(), ...ismMap.keys()])].sort().slice(-12).reverse()
    const trackingRows = trackingMonths.map(month => {
      const estimate = fourMap.get(month)
      const actual = ismMap.get(month)
      return {
        month,
        districts: Object.fromEntries(districts.map(district => [district.key, eqMaps[district.key].get(month)])),
        four: estimate,
        early: earlyMap.get(month),
        ism: actual,
        gap: valid(estimate) && valid(actual) ? estimate - actual : null,
      }
    })

    const componentMonth = comparisonMonth
    const ismComponentsCurrent = ismLatest?.date.slice(0, 7) === componentMonth
    const componentValue = (series, key) => pointForMonth((series?.[key]?.observations || []).filter(point => valid(point.value)), componentMonth)?.value
    const componentRows = ISM_EQUIVALENT_COMPONENTS.map(component => {
      const values = Object.fromEntries(districts.map(district => [
        district.key,
        ismEquivalent(pointForMonth(componentSeries(regional[district.key].series, component).filter(point => valid(point.value)), componentMonth)?.value),
      ]))
      const present = Object.values(values).filter(valid)
      return {
        ...component,
        values,
        average: present.length === districts.length && present.length ? present.reduce((sum, value) => sum + value, 0) / present.length : null,
        ism: ismComponentsCurrent ? payload.ism.latest[component.ism] : null,
      }
    })
    const priceRows = [
      { key: 'pricesPaid', label: 'Prices paid', ism: ismComponentsCurrent ? payload.ism.latest.pricesPaid : null },
      { key: 'pricesReceived', label: 'Prices received', ism: null },
    ].map(row => ({
      ...row,
      values: Object.fromEntries(districts.map(district => [district.key, componentValue(regional[district.key].series, row.key)])),
    }))

    // Leading signals on the ISM scale: new orders minus inventories, and prices paid.
    const regionalNewOrders = districtComponent(regional, ['newOrders'], COMPOSITE_DISTRICTS)
    const regionalInventories = districtComponent(regional, ['inventories'], COMPOSITE_DISTRICTS)
    const ordersInventories = latestByMonth(spreadSeries(regionalNewOrders, regionalInventories))
    const priceDistricts = PRICE_DISTRICTS.filter(key => regional[key]?.series?.pricesPaid)
    const regionalPaid = latestByMonth(districtComponent(regional, ['pricesPaid'], priceDistricts))
    const ismLatestMonth = ismLatest?.date.slice(0, 7)
    const ismOrdersInventories = valid(payload.ism.latest.newOrders) && valid(payload.ism.latest.inventories)
      ? payload.ism.latest.newOrders - payload.ism.latest.inventories
      : null
    const passThrough = Object.fromEntries(priceDistricts.map(key => {
      const series = regional[key].series
      return [key, latestByMonth(spreadSeries(series.pricesReceived?.observations || [], series.pricesPaid?.observations || []))]
    }))
    const outlook = Object.fromEntries(OUTLOOK_DISTRICTS
      .filter(key => regional[key]?.series?.futureHeadline)
      .map(key => [key, latestByMonth(movingAverage(regional[key].series.futureHeadline.observations, 3))]))
    const regionalMonths = [...new Set([...empireMap.keys(), ...phillyMap.keys(), ...(ismLatestMonth ? [ismLatestMonth] : [])])].filter(month => month >= start).sort()
    const regionalLabels = regionalMonths.map(month => monthLabel(`${month}-01`))
    const line = (label, map, color, extra = {}) => ({
      label,
      data: regionalMonths.map(month => map.get(month) ?? null),
      borderColor: color,
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: .24,
      ...extra,
    })

    return {
      cadence: orderedCadence(payload.cadence, releases),
      lagging: Object.values(payload.meta?.freshness || {}).filter(lag => lag.behind > 0),
      districts,
      trackingRows,
      liveStats,
      compositeLabel: fourDistrict.length ? 'Four-district' : 'NY + Philly',
      fourLatest,
      earlyLatest,
      earlyAhead,
      regionalEqLatest: fourLatest || earlyLatest,
      componentRows,
      priceRows,
      ismComponentsCurrent,
      trackingData: {
        labels: months.map(month => monthLabel(`${month}-01`)),
        datasets: [
          { label: 'Early read: NY + Philly', data: months.map(month => earlyMap.get(month) ?? null), borderColor: COLORS.muted, backgroundColor: 'transparent', borderWidth: 1.4, pointRadius: 0, tension: .24, borderDash: [4, 3] },
          ...(fourDistrict.length ? [{ label: 'Four-district ISM-equivalent', data: months.map(month => fourMap.get(month) ?? null), borderColor: COLORS.regional, backgroundColor: 'transparent', borderWidth: 2.6, pointRadius: 0, tension: .24 }] : []),
          { label: 'ISM Manufacturing PMI (official)', data: months.map(month => ismMap.get(month) ?? null), borderColor: COLORS.ism, backgroundColor: COLORS.ism, borderWidth: 2.4, pointRadius: 3, tension: .24, spanGaps: false },
        ],
      },
      ordersInventoriesData: {
        labels: regionalLabels,
        datasets: [
          line('Four-district: new orders − inventories', ordersInventories, COLORS.regional, { borderWidth: 2.4 }),
          line('ISM: new orders − inventories (latest month)', new Map(ismLatestMonth && valid(ismOrdersInventories) ? [[ismLatestMonth, ismOrdersInventories]] : []), COLORS.ism, { pointRadius: 5, showLine: false, backgroundColor: COLORS.ism }),
        ],
      },
      pricesPaidData: {
        labels: regionalLabels,
        datasets: [
          line(`Prices paid, ISM scale (${priceDistricts.map(key => DISTRICT_LABELS[key]).join(' + ')})`, regionalPaid, COLORS.regional, { borderWidth: 2.4 }),
          line('ISM prices (latest month)', new Map(ismLatestMonth && valid(payload.ism.latest.pricesPaid) ? [[ismLatestMonth, payload.ism.latest.pricesPaid]] : []), COLORS.ism, { pointRadius: 5, showLine: false, backgroundColor: COLORS.ism }),
        ],
      },
      passThroughData: {
        labels: regionalLabels,
        datasets: priceDistricts.map(key => line(DISTRICT_LABELS[key], passThrough[key], COLORS[key])),
      },
      outlookData: {
        labels: regionalLabels,
        datasets: Object.keys(outlook).map(key => line(`${DISTRICT_LABELS[key]} · 3-month average`, outlook[key], COLORS[key])),
      },
      latestOrdersInventories: last([...ordersInventories.entries()].map(([month, value]) => ({ month, value }))),
      ismOrdersInventories,
      empire,
      philly,
      ismHeadline,
      empireLatest,
      phillyLatest,
      ismLatest,
      comparisonMonth,
      latestReleases,
      releases,
      readoutLabel,
      regionalSignal,
      ismSignal: signalFor(ismLatest?.value, 50),
      earlyChange: change1m(earlyRead, earlyLatest),
      fourChange: fourLatest ? change1m(fourDistrict, fourLatest) : null,
      ismChange: change1m(ismHeadline, ismLatest),
    }
  }, [payload])

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          <h1>Manufacturing data unavailable</h1>
          <p>{error}</p>
          <Link href="/#united-states">Return to US Macro</Link>
        </div>
      </main>
    )
  }

  if (!model) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          <h1>Loading manufacturing surveys…</h1>
          <p>Connecting to regional Federal Reserve survey data.</p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <DashboardFreshness data={payload} source="NY · Philadelphia · Richmond · Dallas Fed · ISM" />
        <div className={styles.topbar}>
          <Link href="/#united-states">← US Macro Dashboard</Link>
          <span>NY → PHILLY → RICHMOND → DALLAS → ISM</span>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>UNITED STATES / MANUFACTURING SURVEYS ON THE ISM SCALE</div>
          <h1>Manufacturing Momentum</h1>
          <p>
            Four regional Fed surveys translated to the ISM scale, from the mid-month NY + Philly early read
            to the four-district composite at month-end, set against the national ISM PMI.
          </p>
          <div className={styles.heroMeta}>
            <span><i />Regional data refreshes automatically (FRED and Reserve Bank workbooks)</span>
            <span>Frequency: Monthly</span>
            <span>Neutral: 0 regional DI / 50 ISM and ISM-equivalent</span>
          </div>
        </section>

        <section className={styles.clockSection}>
          <div className={styles.sectionHeader}>
            <div>
              <span>01 / RELEASE SEQUENCE</span>
              <h2>The manufacturing information clock</h2>
            </div>
            <p>Regional surveys describe the same month before ISM publishes its national reading the following month.</p>
          </div>

          <div className={styles.releaseClock}>
            {model.cadence.map((stage, index) => (
              <article key={stage.key} className={`${styles.clockStep} ${styles[stage.key]}`}>
                <div className={styles.sequence}>{String(stage.sequence).padStart(2, '0')}</div>
                <div>
                  <span>{stage.importance}</span>
                  <h3>{STAGE_NAMES[stage.key] || stage.key}</h3>
                  <p>{stage.role}</p>
                </div>
                <div className={styles.timing}>
                  <strong>{stage.timing}</strong>
                  <span>{stage.time}</span>
                  <small>{formatRelease(model.releases[stage.key]) || 'Cadence'}</small>
                </div>
                {index < model.cadence.length - 1 && <b className={styles.arrow}>→</b>}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span>02 / THIS MONTH</span>
              <h2>Early read, four-district composite, ISM</h2>
            </div>
            <p>Every value below is on the ISM scale (50 = no change). Regional headlines are converted from their five PMI-counterpart components.</p>
          </div>

          <div className={styles.latestStrip}>
            <div className={styles.latestStripIntro}>
              <span>LATEST RELEASES · ISM SCALE</span>
              <strong>{model.earlyAhead ? `Early read for ${monthLabel(model.earlyLatest.date)}` : `Four-district composite for ${monthLabel(model.fourLatest?.date)}`}</strong>
              <small>
                {model.earlyAhead
                  ? 'Richmond and Dallas have not reported this month yet; the composite stays on the last complete month.'
                  : 'All four districts have reported the latest month.'}
              </small>
            </div>
            {model.latestReleases.map(release => (
              <div className={styles.latestRelease} key={release.key} style={{ '--release': COLORS[release.key] }}>
                <span>{release.label}</span>
                <strong>{valid(release.value) ? release.value.toFixed(1) : '—'}</strong>
                <small>{monthLabel(release.date)} · {release.detail}</small>
              </div>
            ))}
          </div>

          <div className={styles.surveyGrid}>
            <SurveyCard
              label="Early read: NY + Philly"
              role="Mid-month"
              importance="Early"
              value={model.earlyLatest?.value}
              date={model.earlyLatest?.date}
              change={model.earlyChange}
              color={COLORS.empire}
              description="Available from the third Thursday. Fast, but two districts only."
              rows={[{ label: 'Typical gap to ISM (MAE)', value: `${ISM_EQUIVALENT_VALIDATION.earlyRead.mae.toFixed(1)} pt` }]}
            />
            <SurveyCard
              label="Four-district composite"
              role="Month-end"
              importance="Breadth"
              value={model.fourLatest?.value}
              date={model.fourLatest?.date}
              change={model.fourChange}
              color={COLORS.regional}
              description="Adds Richmond and Dallas once both report, late in the month."
              rows={[{ label: 'Typical gap to ISM (MAE)', value: `${ISM_EQUIVALENT_VALIDATION.fourDistrict.mae.toFixed(1)} pt` }]}
            />
            <SurveyCard
              label="ISM Manufacturing PMI"
              role="First business day"
              importance="National"
              value={model.ismLatest?.value}
              date={model.ismLatest?.date}
              change={model.ismChange}
              color={COLORS.ism}
              description="The official national benchmark, entered from the ISM report."
              rows={[{ label: 'Previous ISM as a level guess (MAE)', value: `${ISM_EQUIVALENT_VALIDATION.previousIsm.mae.toFixed(2)} pt` }]}
            />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span>03 / ISM TRACKING</span>
              <h2>Regional surveys on the ISM scale</h2>
            </div>
            <p>Each survey&apos;s five ISM-counterpart components are converted to 50 + DI/2 and averaged, as the ISM PMI is built; the four districts are then averaged.</p>
          </div>

          {model.lagging.length > 0 && (
            <div className={styles.alert} role="status">
              <strong>Behind release schedule</strong>
              {model.lagging.map(lag => (
                <span key={lag.key}>
                  {STAGE_NAMES[lag.key]}: latest {monthLabel(lag.latest)}, {monthLabel(lag.expected)} was due. The four-district composite stops at the last complete month.
                </span>
              ))}
            </div>
          )}

          <div className={styles.stack}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div>
                  <h3>ISM-equivalent regional composite vs ISM PMI</h3>
                  <p>Index · 50 = no change · derived from official NY, Philadelphia, Richmond and Dallas Fed diffusion indexes</p>
                </div>
                <span className={styles.liveBadge}>DERIVED</span>
              </div>
              <div className={styles.chart}>
                <Line data={model.trackingData} options={chartOptions({ neutralLabel: 'Index (50 = neutral)', baseline: 50 })} />
              </div>
            </article>

            <article className={`${styles.panel} ${styles.tablePanel} ${styles.trackingPanel}`}>
              <div className={styles.trackingSummary}>
                <span>{model.compositeLabel} composite · {monthLabel(model.regionalEqLatest?.date)}</span>
                <strong>{valid(model.regionalEqLatest?.value) ? model.regionalEqLatest.value.toFixed(1) : '—'}</strong>
                {model.earlyAhead && (
                  <small>Early read {monthLabel(model.earlyLatest.date)} (NY + Philly only): <b>{model.earlyLatest.value.toFixed(1)}</b></small>
                )}
                <small>
                  Last {model.liveStats.n} months vs ISM: MAE {valid(model.liveStats.mae) ? model.liveStats.mae.toFixed(1) : '—'} pt ·
                  bias {signed(model.liveStats.bias)} pt · corr {valid(model.liveStats.correlation) ? model.liveStats.correlation.toFixed(2) : '—'}
                </small>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.numericTable}>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>4-district</th>
                      <th>ISM</th>
                      <th>Gap</th>
                      {model.districts.map(district => <th key={district.key}>{district.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {model.trackingRows.map(row => (
                      <tr key={row.month}>
                        <td>{monthLabel(`${row.month}-01`)}</td>
                        <td><b>{valid(row.four) ? row.four.toFixed(1) : '—'}</b></td>
                        <td>{valid(row.ism) ? row.ism.toFixed(1) : 'Pending'}</td>
                        <td>{signed(row.gap)}</td>
                        {model.districts.map(district => (
                          <td key={district.key}>{valid(row.districts[district.key]) ? row.districts[district.key].toFixed(1) : '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
          <p className={styles.note}>
            Gap = four-district composite minus ISM. This is a descriptive translation with no fitted parameters, shown next to ISM rather than
            replacing it. Check against ISM history ({ISM_EQUIVALENT_VALIDATION.window}, n = {ISM_EQUIVALENT_VALIDATION.n}, current-vintage regional data):
            four-district MAE {ISM_EQUIVALENT_VALIDATION.fourDistrict.mae.toFixed(1)} pt, correlation {ISM_EQUIVALENT_VALIDATION.fourDistrict.correlation.toFixed(2)};
            NY + Philly alone MAE {ISM_EQUIVALENT_VALIDATION.earlyRead.mae.toFixed(1)} pt; raw headline indexes read against ISM − 50,
            MAE {ISM_EQUIVALENT_VALIDATION.rawHeadlines.mae.toFixed(1)} pt. For reference, simply repeating the previous ISM reading has MAE
            {' '}{ISM_EQUIVALENT_VALIDATION.previousIsm.mae.toFixed(2)} pt: the composite describes breadth across districts; it does not out-predict ISM&apos;s own persistence.
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span>04 / COMPONENT CHECK</span>
              <h2>What is driving the signal?</h2>
            </div>
            <p>Same survey month ({monthLabel(`${model.comparisonMonth}-01`)}). Each regional component on the ISM scale (50 + DI/2).</p>
          </div>

          <div className={`${styles.panel} ${styles.tablePanel}`}>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Regional ↔ ISM component</th>
                    <th>4-district</th>
                    <th>ISM</th>
                    {model.districts.map(district => <th key={district.key}>{district.label}</th>)}
                    <th>Reading</th>
                  </tr>
                </thead>
                <tbody>
                  {model.componentRows.map(row => (
                    <tr key={row.key}>
                      <td>{row.label} ↔ {row.ismLabel}</td>
                      <td><b>{valid(row.average) ? row.average.toFixed(1) : '—'}</b></td>
                      <td className={toneClass(row.ism, 50)}>{valid(row.ism) ? row.ism.toFixed(1) : '—'}</td>
                      {model.districts.map(district => (
                        <td key={district.key} className={toneClass(row.values[district.key], 50)}>
                          {valid(row.values[district.key]) ? row.values[district.key].toFixed(1) : '—'}
                        </td>
                      ))}
                      <td>
                        {row.key === 'deliveryTime'
                          ? 'Higher = slower deliveries'
                          : row.key === 'inventories'
                            ? 'Higher = inventories building'
                            : row.key === 'employment'
                              ? 'Labor breadth'
                              : 'Demand and output breadth'}
                      </td>
                    </tr>
                  ))}
                  {model.priceRows.map(row => (
                    <tr key={row.key} className={styles.secondaryRow}>
                      <td>{row.label} · DI, not in PMI</td>
                      <td>—</td>
                      <td>{valid(row.ism) ? row.ism.toFixed(1) : '—'}</td>
                      {model.districts.map(district => <td key={district.key}>{signed(row.values[district.key])}</td>)}
                      <td>{row.key === 'pricesPaid' ? 'Input-cost pressure' : 'Pricing power'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className={styles.note}>
            Dallas publishes production directly; the other districts use shipments. Delivery time (Richmond: vendor lead time) stands in for
            supplier deliveries. Inventories: Richmond raw materials (closest to ISM&apos;s materials index), Dallas finished goods, NY and Philly total.
            Richmond reports prices as expected percent changes, so it has no price diffusion index here. Green / red = above / below 50, i.e.
            adding to or subtracting from a PMI-style composite.
            {' '}{model.ismComponentsCurrent ? '' : 'ISM components appear once the ISM report for this month is entered.'}
          </p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span>05 / LEADING SIGNALS</span>
              <h2>Orders versus inventories, and input prices</h2>
            </div>
            <p>Both on the ISM scale. The ISM marker is its latest month only: this page keeps ISM component values for the latest report alone.</p>
          </div>
          <div className={styles.equalGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>New orders − inventories</h3><p>Points on the ISM scale · four-district composite</p></div>
                <span className={styles.liveBadge}>DERIVED</span>
              </div>
              <div className={styles.chart}><Line data={model.ordersInventoriesData} options={chartOptions({ neutralLabel: 'Points (0 = balanced)' })} /></div>
              <p className={styles.note}>
                Latest four-district spread {signed(model.latestOrdersInventories?.value)} pt ({monthLabel(model.latestOrdersInventories ? `${model.latestOrdersInventories.month}-01` : null)});
                ISM {signed(model.ismOrdersInventories)} pt ({monthLabel(model.ismLatest?.date)}). Orders running ahead of inventories is a common
                sign of upcoming production; it is a descriptive gauge, not a forecast. Dallas inventories are finished goods.
              </p>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>Prices paid on the ISM scale</h3><p>50 + DI/2 · NY, Philly and Dallas · ISM prices index for reference</p></div>
                <span className={styles.liveBadge}>DERIVED</span>
              </div>
              <div className={styles.chart}><Line data={model.pricesPaidData} options={chartOptions({ neutralLabel: 'Index (50 = no change)', baseline: 50 })} /></div>
              <p className={styles.note}>
                Richmond reports expected percent price changes rather than a diffusion index, so it is not included. ISM&apos;s prices index is not seasonally adjusted.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <span>06 / PRICES &amp; OUTLOOK</span>
              <h2>Pass-through and expectations</h2>
            </div>
            <p>Diffusion indexes, 0 = no change. Below zero, input costs are rising more broadly than selling prices.</p>
          </div>
          <div className={styles.equalGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>Pass-through gap: prices received − paid</h3><p>Diffusion-index points · by district</p></div>
              </div>
              <div className={styles.chart}><Line data={model.passThroughData} options={chartOptions({ neutralLabel: 'Received − paid (DI points)' })} /></div>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>Six-month outlook</h3><p>Future general activity · 3-month average to damp monthly noise</p></div>
              </div>
              <div className={styles.chart}><Line data={model.outlookData} options={chartOptions({ neutralLabel: 'Diffusion index' })} /></div>
            </article>
          </div>
        </section>

        <section className={styles.readout}>
          <div>
            <span>Readout · {monthLabel(model.regionalEqLatest?.date)}</span>
            <h2>{model.readoutLabel}</h2>
            <p>
              The latest {model.compositeLabel.toLowerCase()} ISM-equivalent is{' '}
              <strong className={styles[model.regionalSignal.tone]}>{valid(model.regionalEqLatest?.value) ? model.regionalEqLatest.value.toFixed(1) : '—'}</strong>
              {' '}and the latest ISM PMI ({monthLabel(model.ismLatest?.date)}) is{' '}
              <strong className={styles[model.ismSignal.tone]}>{valid(model.ismLatest?.value) ? model.ismLatest.value.toFixed(1) : '—'}</strong>.
              The composite describes breadth across four districts; it is a derived translation, not a forecast of the next ISM.
            </p>
          </div>
          <div className={styles.readoutRules}>
            <div><b>1</b><span>Mid-month, NY + Philly give an early ISM-scale read (typical gap {ISM_EQUIVALENT_VALIDATION.earlyRead.mae.toFixed(1)} pt).</span></div>
            <div><b>2</b><span>By month-end, Richmond and Dallas complete the four-district composite ({ISM_EQUIVALENT_VALIDATION.fourDistrict.mae.toFixed(1)} pt).</span></div>
            <div><b>3</b><span>ISM resolves the national reading; as a level guess, its own last value is still closer ({ISM_EQUIVALENT_VALIDATION.previousIsm.mae.toFixed(2)} pt).</span></div>
          </div>
        </section>

        <footer className={styles.methodology}>
          <div>
            <strong>Methodology</strong>
            <p>
              A regional diffusion index (%higher − %lower) is not on the ISM scale. With %higher + %same + %lower = 100,
              the ISM-style index %higher + %same/2 equals 50 + DI/2, so each of the five ISM-counterpart components is converted
              that way and averaged with equal weights, as in the ISM PMI. The composite is a derived translation, not a forecast;
              its tracking error is shown beside it. “Lead / Confirm / Anchor” is an analytical hierarchy, not a fitted model.
            </p>
          </div>
          <div>
            <strong>Sources & update policy</strong>
            <p>
              New York and Philadelphia series update automatically from their Federal Reserve Banks via FRED; Richmond and Dallas
              come from each Bank&apos;s own seasonally adjusted historical workbook
              (<a href="https://www.richmondfed.org/region_communities/regional_data_analysis/surveys/manufacturing" target="_blank" rel="noreferrer">Richmond ↗</a>,{' '}
              <a href="https://www.dallasfed.org/research/surveys/tmos" target="_blank" rel="noreferrer">Dallas ↗</a>). Kansas City is not included because its file
              location changes every month and it cannot be retrieved reliably without a browser.
              ISM is a compact, manually verified official snapshot because no public ISM API is available.
              <a href={payload.ism.sourceUrl} target="_blank" rel="noreferrer"> View the official ISM report ↗</a>
            </p>
          </div>
        </footer>
      </div>
    </main>
  )
}
