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
import styles from '../analysis-dashboard.module.css'

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
const clean = series => (series?.observations || []).filter(point => finite(point.value))
const last = values => values?.length ? values.at(-1) : null

function fixed(value, digits = 1, suffix = '') {
  return finite(value) ? `${value.toFixed(digits)}${suffix}` : '—'
}

function signed(value, digits = 1, suffix = '') {
  if (!finite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`
}

function ordinal(value) {
  if (!finite(value)) return '—'
  const rounded = Math.round(value)
  const remainder100 = rounded % 100
  const suffix = remainder100 >= 11 && remainder100 <= 13
    ? 'th'
    : { 1: 'st', 2: 'nd', 3: 'rd' }[rounded % 10] || 'th'
  return `${rounded}${suffix}`
}

function monthLabel(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

function fullMonthLabel(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

function average(values) {
  const observations = (values || []).filter(finite)
  return observations.length
    ? observations.reduce((sum, value) => sum + value, 0) / observations.length
    : null
}

function percentile(values, current) {
  const observations = (values || []).filter(finite).sort((a, b) => a - b)
  if (!observations.length || !finite(current)) return null
  return observations.filter(value => value <= current).length / observations.length * 100
}

function pointChange(values, periods) {
  const observations = (values || []).filter(point => finite(point.value))
  const current = last(observations)
  const prior = observations.at(-(periods + 1))
  return current && prior ? current.value - prior.value : null
}

function yearAgoValue(values, current) {
  if (!current?.date) return null
  const target = `${Number(current.date.slice(0, 4)) - 1}${current.date.slice(4)}`
  return values.find(point => point.date === target && finite(point.value))?.value ?? null
}

function yoySeries(series) {
  const observations = clean(series)
  return observations.flatMap(point => {
    const prior = yearAgoValue(observations, point)
    return finite(prior) && prior !== 0
      ? [{ date: point.date, value: (point.value / prior - 1) * 100 }]
      : []
  })
}

function valuesForDates(points, dates) {
  const values = new Map((points || []).map(point => [point.date, point.value]))
  return dates.map(date => values.get(date) ?? null)
}

function lastTenYears(points) {
  const observations = (points || []).filter(point => finite(point.value))
  const latest = last(observations)?.date
  if (!latest) return []
  const cutoff = new Date(`${latest}T12:00:00Z`)
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 10)
  const start = cutoff.toISOString().slice(0, 10)
  return observations.filter(point => point.date >= start)
}

function sentimentTone(current, longRunAverage) {
  if (!finite(current) || !finite(longRunAverage)) return 'neutral'
  if (current >= longRunAverage + 5) return 'positive'
  if (current <= longRunAverage - 10) return 'negative'
  return 'warning'
}

function expectationTone(value) {
  if (!finite(value)) return 'neutral'
  if (value > 3) return 'negative'
  if (value > 2.5) return 'warning'
  return 'positive'
}

function directionalLabel(change, positive = 'Improving', negative = 'Softening') {
  if (!finite(change) || Math.abs(change) < 0.3) return 'Broadly stable'
  return change > 0 ? positive : negative
}

function baseOptions({ percentAxis = false } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: COLORS.muted, usePointStyle: true, boxWidth: 8, font: { size: 10 } },
      },
      tooltip: {
        backgroundColor: '#142b3c',
        padding: 10,
        callbacks: {
          label: context => `${context.dataset.label}: ${finite(context.parsed.y) ? context.parsed.y.toFixed(1) : '—'}${percentAxis ? '%' : ''}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: COLORS.muted, maxTicksLimit: 11, font: { size: 9 } } },
      y: {
        grid: { color: COLORS.grid },
        ticks: {
          color: COLORS.muted,
          font: { size: 9 },
          callback: value => `${value}${percentAxis ? '%' : ''}`,
        },
      },
    },
  }
}

function MetricCard({ label, value, period, rows, tone = 'neutral' }) {
  return (
    <article className={`${styles.metricCard} ${styles[tone] || ''}`}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricHeadline}>
        <strong>{value}</strong>
        <span>{period}</span>
      </div>
      <div className={styles.metricRows}>
        {rows.map(row => (
          <div key={row.label}>
            <span>{row.label}</span>
            <b>{row.value}</b>
          </div>
        ))}
      </div>
    </article>
  )
}

function buildSignals(model) {
  const expectationMomentum = directionalLabel(model.expectationThreeMonthChange, 'Rising', 'Easing')
  const sentimentMomentum = directionalLabel(model.sentimentThreeMonthChange)
  const demandLabel = finite(model.realPceYoy)
    ? model.realPceYoy >= 2 ? 'Resilient' : model.realPceYoy >= 0 ? 'Growing slowly' : 'Contracting'
    : 'Awaiting data'
  const expectationLabel = finite(model.expectation?.value)
    ? model.expectation.value > 3 ? 'High' : model.expectation.value > 2.5 ? 'Elevated' : 'Contained'
    : 'Awaiting data'
  const sentimentGap = finite(model.sentiment?.value) && finite(model.sentimentAverage)
    ? model.sentiment.value - model.sentimentAverage
    : null

  let regime = 'Mixed consumer signal'
  let summary = 'Confidence and spending are not sending one uniform signal; use the component readings below.'
  if (finite(sentimentGap) && finite(model.realPceYoy)) {
    if (sentimentGap < 0 && model.realPceYoy >= 1) {
      regime = 'Cautious sentiment, resilient spending'
      summary = 'Households report below-normal confidence, but realized consumption remains positive—a familiar survey-versus-hard-data divergence.'
    } else if (sentimentGap < 0 && model.realPceYoy < 1) {
      regime = 'Fragile household pulse'
      summary = 'Below-normal confidence is being confirmed by weak real consumption growth.'
    } else if (sentimentGap >= 0 && model.realPceYoy >= 1) {
      regime = 'Broad household resilience'
      summary = 'Confidence and realized spending both sit on the firmer side of their reference points.'
    } else {
      regime = 'Confidence ahead of spending'
      summary = 'Survey confidence is relatively firm, but realized consumption has yet to confirm that signal.'
    }
  }

  return {
    regime,
    summary,
    items: [
      {
        label: 'Sentiment level',
        value: finite(sentimentGap) ? sentimentGap >= 0 ? 'Above long-run average' : 'Below long-run average' : 'Awaiting data',
        detail: finite(sentimentGap) ? `${signed(sentimentGap, 1, 'pt')} versus full-history average` : 'No reference available',
        tone: finite(sentimentGap) && sentimentGap >= 0 ? 'positiveText' : 'warningText',
      },
      {
        label: 'Sentiment momentum',
        value: sentimentMomentum,
        detail: `${signed(model.sentimentThreeMonthChange, 1, 'pt')} over three observations`,
        tone: model.sentimentThreeMonthChange > 0.3 ? 'positiveText' : model.sentimentThreeMonthChange < -0.3 ? 'negativeText' : 'neutralText',
      },
      {
        label: 'One-year price beliefs',
        value: `${expectationLabel} · ${expectationMomentum}`,
        detail: `${fixed(model.expectation?.value, 1, '%')} latest; ${signed(model.expectationThreeMonthChange, 1, 'pp')} over three observations`,
        tone: model.expectation?.value > 3 ? 'negativeText' : model.expectation?.value > 2.5 ? 'warningText' : 'positiveText',
      },
      {
        label: 'Real spending confirmation',
        value: demandLabel,
        detail: `${signed(model.realPceYoy, 1, '%')} year over year`,
        tone: model.realPceYoy >= 2 ? 'positiveText' : model.realPceYoy < 0 ? 'negativeText' : 'neutralText',
      },
    ],
  }
}

export default function UsSentimentDashboard() {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/us-sentiment', { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || body.error) throw new Error(body.error || 'Unable to load sentiment data.')
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
    const { series } = payload
    const sentimentHistory = clean(series.sentiment)
    const expectationHistory = clean(series.oneYearInflation)
    const cpiYoy = yoySeries(series.headlineCpi)
    const corePceYoy = yoySeries(series.corePce)
    const realPceYoy = yoySeries(series.realPce)
    const sentiment = last(sentimentHistory)
    const expectation = last(expectationHistory)
    const cpi = last(cpiYoy)
    const corePce = last(corePceYoy)
    const realPce = last(realPceYoy)
    const unemployment = last(clean(series.unemployment))
    const sentimentAverage = average(sentimentHistory.map(point => point.value))

    const prepared = {
      payload,
      series,
      sentiment,
      expectation,
      cpi,
      corePce,
      realPce,
      unemployment,
      sentimentHistory,
      expectationHistory,
      cpiYoy,
      corePceYoy,
      realPceYoy,
      sentimentAverage,
      sentimentPercentile: percentile(sentimentHistory.map(point => point.value), sentiment?.value),
      sentimentOneMonthChange: pointChange(sentimentHistory, 1),
      sentimentThreeMonthChange: pointChange(sentimentHistory, 3),
      expectationOneMonthChange: pointChange(expectationHistory, 1),
      expectationThreeMonthChange: pointChange(expectationHistory, 3),
      realPceYoy: realPce?.value,
      expectationCpiGap: expectation && cpi ? expectation.value - cpi.value : null,
      expectationCorePceGap: expectation && corePce ? expectation.value - corePce.value : null,
    }
    prepared.signal = buildSignals(prepared)
    return prepared
  }, [payload])

  if (error) {
    return <main className={styles.error}><strong>Sentiment data unavailable</strong><p>{error}</p></main>
  }
  if (!model) {
    return <main className={styles.loading}>Loading consumer sentiment and inflation expectations…</main>
  }

  const sentimentWindow = lastTenYears(model.sentimentHistory)
  const inflationWindow = lastTenYears(model.expectationHistory)
  const inflationDates = inflationWindow.map(point => point.date)

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <Link href="/us">← US workspace</Link>
          <span>University of Michigan · BLS · BEA via FRED</span>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>US / SURVEYS &amp; SENTIMENT / ★★★ CORE</div>
          <h1>Consumer Sentiment &amp; Inflation Expectations</h1>
          <p>
            Read household confidence and one-year price beliefs alongside realized inflation,
            real consumption and unemployment—without mixing in licensed Conference Board data.
          </p>
          <div className={styles.heroMeta}>
            <span><i />Updated automatically</span>
            <span>Monthly · FRED public series</span>
            <span>Michigan readings delayed one month</span>
          </div>
        </section>

        <section className={styles.metricGrid} aria-label="Latest consumer sentiment readings">
          <MetricCard
            label="Michigan Sentiment"
            value={fixed(model.sentiment?.value, 1)}
            period={fullMonthLabel(model.sentiment?.date)}
            rows={[
              { label: '1-month change', value: signed(model.sentimentOneMonthChange, 1, 'pt') },
              { label: 'History percentile', value: ordinal(model.sentimentPercentile) },
            ]}
            tone={sentimentTone(model.sentiment?.value, model.sentimentAverage)}
          />
          <MetricCard
            label="1Y Inflation Expectation"
            value={fixed(model.expectation?.value, 1, '%')}
            period={fullMonthLabel(model.expectation?.date)}
            rows={[
              { label: '1-month change', value: signed(model.expectationOneMonthChange, 1, 'pp') },
              { label: '3-observation change', value: signed(model.expectationThreeMonthChange, 1, 'pp') },
            ]}
            tone={expectationTone(model.expectation?.value)}
          />
          <MetricCard
            label="Realized Inflation"
            value={fixed(model.cpi?.value, 1, '%')}
            period={fullMonthLabel(model.cpi?.date)}
            rows={[
              { label: 'Core PCE YoY', value: fixed(model.corePce?.value, 1, '%') },
              { label: 'Expectation − CPI', value: signed(model.expectationCpiGap, 1, 'pp') },
            ]}
            tone={model.cpi?.value > 3 ? 'negative' : model.cpi?.value > 2 ? 'warning' : 'positive'}
          />
          <MetricCard
            label="Household Backdrop"
            value={signed(model.realPceYoy, 1, '%')}
            period={fullMonthLabel(model.realPce?.date)}
            rows={[
              { label: 'Measure', value: 'Real PCE YoY' },
              { label: 'Unemployment', value: fixed(model.unemployment?.value, 1, '%') },
            ]}
            tone={model.realPceYoy >= 2 ? 'positive' : model.realPceYoy < 0 ? 'negative' : 'warning'}
          />
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>01 / HOUSEHOLD REGIME</span><h2>{model.signal.regime}</h2></div>
            <p>{model.signal.summary}</p>
          </header>
          <div className={styles.mainGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}>
                <div><h3>Consumer sentiment</h3><p>Last ten years versus the full-history average</p></div>
                <b className={styles.tag}>1M FRED LAG</b>
              </div>
              <div className={styles.chart}>
                <Line
                  data={{
                    labels: sentimentWindow.map(point => monthLabel(point.date)),
                    datasets: [
                      {
                        label: 'Michigan sentiment',
                        data: sentimentWindow.map(point => point.value),
                        borderColor: COLORS.orange,
                        backgroundColor: 'rgba(240,138,36,.10)',
                        borderWidth: 2.2,
                        pointRadius: 0,
                        tension: 0.16,
                        fill: true,
                      },
                      {
                        label: `Full-history average · ${fixed(model.sentimentAverage, 1)}`,
                        data: sentimentWindow.map(() => model.sentimentAverage),
                        borderColor: COLORS.blue,
                        borderDash: [5, 4],
                        borderWidth: 1.4,
                        pointRadius: 0,
                      },
                    ],
                  }}
                  options={baseOptions()}
                />
              </div>
            </article>
            <article className={styles.analysis}>
              <div>
                <div className={styles.analysisKicker}>SIGNAL MATRIX</div>
                <div className={styles.analysisScore}>
                  <div><strong>{model.signal.regime}</strong><small>Survey signal checked against hard data</small></div>
                </div>
                <ul>
                  {model.signal.items.map(item => (
                    <li key={item.label}>
                      <span>{item.label}<small>{item.detail}</small></span>
                      <b className={styles[item.tone]}>{item.value}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>02 / PRICE BELIEFS</span><h2>Expected versus realized inflation</h2></div>
            <p>Consumer expectations can react strongly to salient prices and should be compared with—not substituted for—official inflation measures.</p>
          </header>
          <div className={styles.panel}>
            <div className={styles.chart}>
              <Line
                data={{
                  labels: inflationDates.map(monthLabel),
                  datasets: [
                    {
                      label: 'Michigan 1Y expectation',
                      data: inflationWindow.map(point => point.value),
                      borderColor: COLORS.orange,
                      borderWidth: 2.3,
                      pointRadius: 0,
                      tension: 0.16,
                    },
                    {
                      label: 'Headline CPI YoY',
                      data: valuesForDates(model.cpiYoy, inflationDates),
                      borderColor: COLORS.red,
                      borderWidth: 1.8,
                      pointRadius: 0,
                      tension: 0.16,
                    },
                    {
                      label: 'Core PCE YoY',
                      data: valuesForDates(model.corePceYoy, inflationDates),
                      borderColor: COLORS.green,
                      borderWidth: 1.8,
                      pointRadius: 0,
                      tension: 0.16,
                    },
                  ],
                }}
                options={baseOptions({ percentAxis: true })}
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>03 / MOMENTUM TABLE</span><h2>Comparable changes and reference points</h2></div>
            <p>“Easing” means a positive inflation-expectation rate is moderating; it does not imply falling prices.</p>
          </header>
          <div className={styles.panel}>
            <div className={styles.tableWrap}>
              <table className={styles.matrix}>
                <thead>
                  <tr><th>Indicator</th><th>Latest</th><th>1 observation</th><th>3 observations</th><th>Reference</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Consumer sentiment</td>
                    <td>{fixed(model.sentiment?.value, 1)}</td>
                    <td>{signed(model.sentimentOneMonthChange, 1, 'pt')}</td>
                    <td>{signed(model.sentimentThreeMonthChange, 1, 'pt')}</td>
                    <td>{fixed(model.sentimentAverage, 1)} long-run avg.</td>
                  </tr>
                  <tr>
                    <td>1Y inflation expectation</td>
                    <td>{fixed(model.expectation?.value, 1, '%')}</td>
                    <td>{signed(model.expectationOneMonthChange, 1, 'pp')}</td>
                    <td>{signed(model.expectationThreeMonthChange, 1, 'pp')}</td>
                    <td>{signed(model.expectationCorePceGap, 1, 'pp')} vs core PCE</td>
                  </tr>
                  <tr>
                    <td>Headline CPI</td>
                    <td>{fixed(model.cpi?.value, 1, '%')}</td>
                    <td colSpan="2">Year-over-year rate</td>
                    <td>2% policy reference</td>
                  </tr>
                  <tr>
                    <td>Real personal consumption</td>
                    <td>{signed(model.realPceYoy, 1, '%')}</td>
                    <td colSpan="2">Year-over-year growth</td>
                    <td>Hard-data confirmation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div><span>04 / RELEASE FLOW</span><h2>How to read the monthly sequence</h2></div>
            <p>JapanPulse uses the stable public FRED archive rather than scraping the University’s current release pages.</p>
          </header>
          <div className={styles.equalGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeading}><div><h3>Preliminary results</h3><p>Usually the first market-moving signal during the month</p></div><b className={styles.tag}>MID-MONTH</b></div>
              <p className={styles.neutralText}>Use the official Michigan release for the most current preliminary headline and revision context.</p>
            </article>
            <article className={styles.panel}>
              <div className={styles.panelHeading}><div><h3>Final → FRED archive</h3><p>Final survey update, followed by the public historical series</p></div><b className={styles.tag}>1M DELAY</b></div>
              <p className={styles.neutralText}>Charts on this page prioritize repeatable history and clear licensing boundaries over same-day release speed.</p>
            </article>
          </div>
        </section>

        <section className={styles.methodology}>
          <strong>Methodology &amp; source discipline.</strong>{' '}
          University of Michigan: Consumer Sentiment © [UMCSENT] and University of Michigan: Inflation Expectation © [MICH]
          are retrieved from FRED, Federal Reserve Bank of St. Louis, and shown with the citation and delay required by the source.
          CPI, core PCE, real PCE and unemployment provide public hard-data comparators. The signal labels are deterministic
          descriptions—not forecasts or investment recommendations. Licensed subcomponents, demographic cuts and Conference Board
          readings are deliberately excluded.{' '}
          <a href="https://fred.stlouisfed.org/series/UMCSENT" rel="noreferrer" target="_blank">UMCSENT ↗</a>
          {' · '}
          <a href="https://fred.stlouisfed.org/series/MICH" rel="noreferrer" target="_blank">MICH ↗</a>
          {' · '}
          <a href="https://data.sca.isr.umich.edu/" rel="noreferrer" target="_blank">Official release ↗</a>
          {' · '}
          <Link href="/us/consumption">PCE &amp; Consumer Pulse →</Link>
        </section>
      </div>
    </main>
  )
}
