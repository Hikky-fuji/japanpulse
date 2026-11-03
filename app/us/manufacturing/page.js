'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { DashboardFreshness } from '../../components/DashboardStatus'
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
import {
  COMPOSITE_DISTRICTS,
  EARLY_READ_DISTRICTS,
  ISM_EQUIVALENT_COMPONENTS,
  ISM_EQUIVALENT_VALIDATION,
  componentSeries,
  districtComposite,
  ismEquivalent,
  ismEquivalentComposite,
  trackingStats,
} from '../../lib/regional-ism.mjs'
import { regionalReleaseDate } from '../../lib/regional-surveys.mjs'

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
  empire: '#42a9bc',
  philly: '#a99af0',
  ism: '#f08a24',
  regional: '#60d4af',
  green: '#60d4af',
  red: '#ff6b6b',
  muted: '#c7cdd1',
  grid: '#4a5258',
}

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

function pointChange(values, periods = 1) {
  if (!values || values.length <= periods) return null
  return values.at(-1).value - values.at(-1 - periods).value
}

function latestByMonth(observations) {
  return new Map(
    (observations || [])
      .filter(point => valid(point.value))
      .map(point => [point.date.slice(0, 7), point.value]),
  )
}

function observationsThroughMonth(observations, month) {
  if (!month) return observations || []
  return (observations || []).filter(point => point.date.slice(0, 7) <= month)
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

function SurveyCard({ label, role, importance, value, neutral, date, change, color, description, comparisonMonth, equivalent, equivalentLabel = 'ISM-equivalent (5 components)' }) {
  const signal = signalFor(value, neutral)
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
      {valid(equivalent) && (
        <div className={styles.cardFooter}>
          <span>{equivalentLabel}</span>
          <b>{equivalent.toFixed(1)}</b>
        </div>
      )}
      <div className={styles.cardFooter}>
        <span>1M change through {monthLabel(`${comparisonMonth}-01`)}</span>
        <b className={change >= 0 ? styles.positive : styles.negative}>{signed(change)} pt</b>
      </div>
    </article>
  )
}

function toneClass(value, neutral) {
  if (!valid(value) || value === neutral) return undefined
  return value > neutral ? styles.positive : styles.negative
}

function chartOptions({ neutralLabel = 'Neutral', bar = false, baseline = 0 } = {}) {
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
          pointStyle: bar ? 'rectRounded' : 'circle',
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
    const empireComparison = pointForMonth(empireHeadline, comparisonMonth)
    const phillyComparison = pointForMonth(phillyHeadline, comparisonMonth)
    const ismComparison = pointForMonth(ismHeadline, comparisonMonth)

    const regionalDirection = [empireComparison?.value, phillyComparison?.value].filter(valid)
    const positiveRegional = regionalDirection.filter(value => value > 0).length
    const leadLabel = regionalDirection.length < 2
      ? 'Regional signals are incomplete'
      : positiveRegional === 2
        ? 'Regional signals agree on expansion'
        : positiveRegional === 0
          ? 'Regional signals agree on contraction'
          : 'Regional signals are mixed'
    const ismSignal = signalFor(ismComparison?.value, 50)
    const latestReleases = [
      { key: 'empire', label: 'New York', point: empireLatest, neutral: 0 },
      { key: 'philly', label: 'Philadelphia', point: phillyLatest, neutral: 0 },
      { key: 'ism', label: 'ISM', point: ismLatest, neutral: 50 },
    ]
    const hasNewerRelease = latestReleases.some(
      release => release.point?.date.slice(0, 7) !== comparisonMonth,
    )

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

    const seriesMap = (series, key) => latestByMonth(series[key]?.observations)
    const priceMaps = {
      empirePaid: seriesMap(empire, 'pricesPaid'),
      empireReceived: seriesMap(empire, 'pricesReceived'),
      phillyPaid: seriesMap(philly, 'pricesPaid'),
      phillyReceived: seriesMap(philly, 'pricesReceived'),
    }
    const empireFuture = seriesMap(empire, 'futureHeadline')
    const phillyFuture = seriesMap(philly, 'futureHeadline')
    const regionalMonths = [...new Set([...empireMap.keys(), ...phillyMap.keys()])].filter(month => month >= start).sort()
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
      empireEqComparison: eqMaps.empire?.get(comparisonMonth),
      phillyEqComparison: eqMaps.philly?.get(comparisonMonth),
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
      pricesData: {
        labels: regionalLabels,
        datasets: [
          line('New York prices paid', priceMaps.empirePaid, COLORS.empire),
          line('New York prices received', priceMaps.empireReceived, COLORS.empire, { borderDash: [5, 4], borderWidth: 1.6 }),
          line('Philadelphia prices paid', priceMaps.phillyPaid, COLORS.philly),
          line('Philadelphia prices received', priceMaps.phillyReceived, COLORS.philly, { borderDash: [5, 4], borderWidth: 1.6 }),
        ],
      },
      outlookData: {
        labels: regionalLabels,
        datasets: [
          line('New York · 6 months ahead', empireFuture, COLORS.empire),
          line('Philadelphia · 6 months ahead', phillyFuture, COLORS.philly),
        ],
      },
      empire,
      philly,
      empireHeadline,
      phillyHeadline,
      ismHeadline,
      empireLatest,
      phillyLatest,
      ismLatest,
      empireComparison,
      phillyComparison,
      ismComparison,
      comparisonMonth,
      latestReleases,
      hasNewerRelease,
      releases,
      leadLabel,
      ismSignal,
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
          <div className={styles.eyebrow}>UNITED STATES / MANUFACTURING SURVEY CLOCK</div>
          <h1>Manufacturing Momentum</h1>
          <p>
            Follow the monthly information sequence from the first regional read to confirmation
            and finally the national ISM anchor. Importance is shown as a decision hierarchy—not
            as an arbitrary statistical weight.
          </p>
          <div className={styles.heroMeta}>
            <span><i />Regional data refreshes automatically via FRED</span>
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
              <span>02 / COMPARABLE SNAPSHOT</span>
              <h2>Lead, confirm, anchor — same survey month</h2>
            </div>
            <p>All three cards and momentum calculations are aligned to {monthLabel(`${model.comparisonMonth}-01`)}.</p>
          </div>

          <div className={styles.latestStrip}>
            <div className={styles.latestStripIntro}>
              <span>LATEST RELEASE SEQUENCE</span>
              <strong>Comparison month: {monthLabel(`${model.comparisonMonth}-01`)}</strong>
              <small>
                {model.hasNewerRelease
                  ? 'Newer releases stay visible here, but do not enter the cross-survey verdict until all three surveys catch up.'
                  : 'All three surveys currently refer to the same month.'}
              </small>
            </div>
            {model.latestReleases.map(release => {
              const releaseMonth = release.point?.date.slice(0, 7)
              const isAhead = releaseMonth !== model.comparisonMonth
              return (
                <div className={styles.latestRelease} key={release.key} style={{ '--release': COLORS[release.key] }}>
                  <span>{release.label}</span>
                  <strong>{valid(release.point?.value) ? release.point.value.toFixed(1) : '—'}</strong>
                  <small>{monthLabel(release.point?.date)} · {isAhead ? 'New lead' : 'Aligned'}</small>
                </div>
              )
            })}
          </div>

          <div className={styles.surveyGrid}>
            <SurveyCard
              label="New York Empire"
              role="First read"
              importance="Regional lead"
              value={model.empireComparison?.value}
              neutral={0}
              date={model.empireComparison?.date}
              change={pointChange(observationsThroughMonth(model.empireHeadline, model.comparisonMonth))}
              color={COLORS.empire}
              comparisonMonth={model.comparisonMonth}
              equivalent={model.empireEqComparison}
              description="Fast but geographically narrow. Useful for direction, not a national conclusion."
            />
            <SurveyCard
              label="Philadelphia Fed"
              role="Second read"
              importance="Regional confirm"
              value={model.phillyComparison?.value}
              neutral={0}
              date={model.phillyComparison?.date}
              change={pointChange(observationsThroughMonth(model.phillyHeadline, model.comparisonMonth))}
              color={COLORS.philly}
              comparisonMonth={model.comparisonMonth}
              equivalent={model.phillyEqComparison}
              description="Long-running regional survey that confirms—or challenges—the first New York signal."
            />
            <SurveyCard
              label="ISM Manufacturing"
              role="Final anchor"
              importance="National"
              value={model.ismComparison?.value}
              neutral={50}
              date={model.ismComparison?.date}
              change={pointChange(observationsThroughMonth(model.ismHeadline, model.comparisonMonth))}
              color={COLORS.ism}
              comparisonMonth={model.comparisonMonth}
              equivalent={model.ismComparison?.value}
              equivalentLabel="Official PMI (no conversion)"
              description="The national benchmark. It carries the greatest decision weight in the sequence."
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
              <span>05 / PRICES &amp; OUTLOOK</span>
              <h2>Cost pass-through and expectations</h2>
            </div>
            <p>Diffusion indexes, 0 = no change. Paid above received means input costs are rising more broadly than selling prices.</p>
          </div>
          <div className={styles.equalGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>Prices paid vs received</h3><p>Diffusion index · solid = paid · dashed = received</p></div>
              </div>
              <div className={styles.chart}><Line data={model.pricesData} options={chartOptions({ neutralLabel: 'Diffusion index' })} /></div>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>Six-month outlook</h3><p>Future general activity · diffusion index</p></div>
              </div>
              <div className={styles.chart}><Line data={model.outlookData} options={chartOptions({ neutralLabel: 'Diffusion index' })} /></div>
            </article>
          </div>
        </section>

        <section className={styles.readout}>
          <div>
            <span>Aligned readout · {monthLabel(`${model.comparisonMonth}-01`)}</span>
            <h2>{model.leadLabel}</h2>
            <p>
              The same-month national anchor is <strong className={styles[model.ismSignal.tone]}>{model.ismSignal.label.toLowerCase()}</strong>.
              {valid(model.regionalEqLatest?.value) && (
                <> The latest {model.compositeLabel.toLowerCase()} ISM-equivalent ({monthLabel(model.regionalEqLatest.date)}) is{' '}
                <strong>{model.regionalEqLatest.value.toFixed(1)}</strong>, a derived translation whose typical gap to ISM is about {ISM_EQUIVALENT_VALIDATION.fourDistrict.mae.toFixed(1)} points.</>
              )}
              {' '}Newer regional releases update the live sequence above without contaminating this horizontal comparison.
            </p>
          </div>
          <div className={styles.readoutRules}>
            <div><b>1</b><span>NY sets the first directional clue.</span></div>
            <div><b>2</b><span>Philly determines whether the clue has breadth.</span></div>
            <div><b>3</b><span>ISM resolves the national manufacturing signal.</span></div>
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
