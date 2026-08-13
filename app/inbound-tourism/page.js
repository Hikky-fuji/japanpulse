'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  ArcElement,
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
  ArcElement,
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
  orange: '#f08a24',
  blue: '#42a9bc',
  green: '#60d4af',
  red: '#ff6b6b',
  violet: '#a99af0',
  yellow: '#e4bd54',
  muted: '#c7cdd1',
  grid: '#4a5258',
}

const compact = value => Number.isFinite(value)
  ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
  : '—'
const percent = (value, digits = 1) => Number.isFinite(value)
  ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}%`
  : '—'
const yen = value => Number.isFinite(value)
  ? `¥${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`
  : '—'
const monthLabel = value => value
  ? new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(`${value}-01T00:00:00Z`))
  : '—'

function toneFor(value) {
  if (!Number.isFinite(value)) return 'neutral'
  if (value > 0.05) return 'positive'
  if (value < -0.05) return 'negative'
  return 'neutral'
}

function MetricCard({ label, value, detail, period, tone = 'neutral' }) {
  return (
    <article className={`${styles.metricCard} ${styles[tone]}`}>
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <small>{period}</small>
      </div>
      <p>{detail}</p>
    </article>
  )
}

function PanelHeader({ kicker, title, note }) {
  return (
    <header className={styles.panelHeader}>
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {note ? <p>{note}</p> : null}
    </header>
  )
}

export default function InboundTourismPage() {
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/inbound-tourism', { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok || body.error) throw new Error(body.error || 'Unable to load tourism data.')
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
    const latest = payload.arrivalSummary
    const priorMonth = payload.arrivals.at(-2)
    const spending = payload.spending
    const accommodation = payload.accommodation
    const topMarkets = payload.markets.slice(0, 10)
    const spendingTotal = spending.totalYen
    const liveCount = payload.meta.sources.filter(source => source.live).length
    const latestVsPrior = priorMonth?.value
      ? (latest.value / priorMonth.value - 1) * 100
      : null
    const valueVolumeGap = spending.yoy - latest.yoy

    const volumeRead = latest.yoy < -1
      ? `Visitor volumes softened ${Math.abs(latest.yoy).toFixed(1)}% from a year earlier.`
      : latest.yoy > 1
        ? `Visitor volumes expanded ${latest.yoy.toFixed(1)}% from a year earlier.`
        : 'Visitor volumes were broadly stable from a year earlier.'
    const valueRead = spending.yoy > latest.yoy + 2
      ? `Spending held up better than headcount, with a ${valueVolumeGap.toFixed(1)}pp value-versus-volume gap.`
      : 'Spending broadly tracked the direction of visitor volumes.'
    const breadthRead = payload.analysis.positiveMarkets >= payload.analysis.marketCount / 2
      ? `${payload.analysis.positiveMarkets} of ${payload.analysis.marketCount} tracked markets grew, so weakness was not broad-based.`
      : `Only ${payload.analysis.positiveMarkets} of ${payload.analysis.marketCount} tracked markets grew, pointing to narrow demand breadth.`
    const lodgingRead = Number.isFinite(accommodation.foreignYoy)
      ? accommodation.foreignYoy < latest.yoy - 3
        ? 'Foreign guest nights weakened more than arrivals, a negative signal for stay length or hotel capture.'
        : 'Foreign guest nights moved broadly in line with arrivals.'
      : 'The latest first estimate updates lodging levels; growth rates will follow in the detailed release.'

    return {
      latest,
      spending,
      accommodation,
      topMarkets,
      spendingTotal,
      liveCount,
      latestVsPrior,
      insights: [
        { title: 'Volume', text: volumeRead, tone: toneFor(latest.yoy) },
        { title: 'Value capture', text: valueRead, tone: toneFor(valueVolumeGap) },
        { title: 'Market breadth', text: breadthRead, tone: payload.analysis.positiveMarkets >= payload.analysis.marketCount / 2 ? 'positive' : 'negative' },
        {
          title: 'Accommodation transmission',
          text: lodgingRead,
          tone: Number.isFinite(accommodation.foreignYoy)
            ? toneFor(accommodation.foreignYoy - latest.yoy)
            : 'neutral',
        },
      ],
    }
  }, [payload])

  if (error) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <div className={styles.error}>
            <strong>Tourism data could not be loaded.</strong>
            <span>{error}</span>
          </div>
        </section>
      </main>
    )
  }

  if (!model) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <div className={styles.loading}>Loading official tourism releases…</div>
        </section>
      </main>
    )
  }

  const arrivalsChart = {
    labels: payload.arrivals.map(point => monthLabel(point.date)),
    datasets: [
      {
        type: 'bar',
        label: 'Visitor arrivals',
        data: payload.arrivals.map(point => point.value),
        yAxisID: 'arrivals',
        backgroundColor: payload.arrivals.map(point => point.yoy >= 0 ? 'rgba(96, 212, 175, .72)' : 'rgba(255, 107, 107, .78)'),
        borderWidth: 0,
      },
      {
        type: 'line',
        label: 'YoY',
        data: payload.arrivals.map(point => point.yoy),
        yAxisID: 'growth',
        borderColor: COLORS.blue,
        backgroundColor: COLORS.blue,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: .25,
      },
    ],
  }

  const arrivalsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: COLORS.muted, usePointStyle: true, boxWidth: 8, font: { size: 10 } } },
      tooltip: {
        backgroundColor: '#142b3c',
        callbacks: {
          label: context => context.dataset.yAxisID === 'growth'
            ? `${context.dataset.label}: ${percent(context.parsed.y)}`
            : `${context.dataset.label}: ${context.parsed.y.toLocaleString('en-US')}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: COLORS.muted, maxTicksLimit: 12, font: { size: 9 } } },
      arrivals: {
        position: 'left',
        grid: { color: COLORS.grid },
        ticks: { color: COLORS.muted, callback: value => compact(value), font: { size: 9 } },
      },
      growth: {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: COLORS.blue, callback: value => `${value}%`, font: { size: 9 } },
      },
    },
  }

  const marketChart = {
    labels: model.topMarkets.map(market => market.name),
    datasets: [{
      label: 'Latest arrivals',
      data: model.topMarkets.map(market => market.value),
      backgroundColor: model.topMarkets.map(market => market.yoy >= 0 ? COLORS.green : COLORS.red),
      borderWidth: 0,
      borderRadius: 2,
    }],
  }

  const marketOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#142b3c', callbacks: { label: context => context.parsed.x.toLocaleString('en-US') } },
    },
    scales: {
      x: { grid: { color: COLORS.grid }, ticks: { color: COLORS.muted, callback: value => compact(value), font: { size: 9 } } },
      y: { grid: { display: false }, ticks: { color: '#edf0f2', font: { size: 10 } } },
    },
  }

  const spendingChart = {
    labels: model.spending.categories.map(item => item.name),
    datasets: [{
      data: model.spending.categories.map(item => item.valueYen),
      backgroundColor: [COLORS.orange, COLORS.blue, COLORS.green, COLORS.violet, COLORS.yellow, '#737d83'],
      borderColor: '#30363a',
      borderWidth: 2,
    }],
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <Link href="/">← Japan workspace</Link>
          <span>TRADE / SERVICES EXPORT CHANNEL</span>
        </div>

        <section className={styles.hero}>
          <div className={styles.eyebrow}>JAPAN / INBOUND TOURISM</div>
          <h1>Inbound Tourism & Services Exports</h1>
          <p>
            A volume-to-value view of foreign demand: arrivals, source-market breadth,
            travel spending, spend per visitor and accommodation transmission.
          </p>
          <div className={styles.heroMeta}>
            <span><i /> {model.liveCount}/3 official files parsed live</span>
            <span>Monthly arrivals · Quarterly spending</span>
            <span>★★ Supporting indicator</span>
          </div>
        </section>

        <section className={styles.metricGrid} aria-label="Latest tourism readings">
          <MetricCard
            label="Visitor arrivals"
            value={compact(model.latest.value)}
            detail={`${percent(model.latest.yoy)} YoY · ${percent(model.latestVsPrior)} MoM (NSA)`}
            period={monthLabel(model.latest.period)}
            tone={toneFor(model.latest.yoy)}
          />
          <MetricCard
            label="Year-to-date arrivals"
            value={compact(model.latest.ytd)}
            detail={`${percent(model.latest.ytdYoy)} versus prior-year YTD`}
            period="Cumulative"
            tone={toneFor(model.latest.ytdYoy)}
          />
          <MetricCard
            label="Inbound spending"
            value={yen(model.spending.totalYen)}
            detail={`${percent(model.spending.yoy)} YoY · travel-services demand`}
            period={model.spending.period}
            tone={toneFor(model.spending.yoy)}
          />
          <MetricCard
            label="Spend per visitor"
            value={yen(model.spending.perVisitorYen)}
            detail={`${percent(model.spending.perVisitorYoy)} YoY · general visitors`}
            period={model.spending.period}
            tone={toneFor(model.spending.perVisitorYoy)}
          />
        </section>

        <section className={styles.section}>
          <PanelHeader
            kicker="01 / VOLUME MOMENTUM"
            title="Arrivals and annual growth"
            note="Monthly JNTO arrivals are not seasonally adjusted; read month-to-month moves cautiously."
          />
          <article className={styles.panel}>
            <div className={styles.largeChart}><Bar data={arrivalsChart} options={arrivalsOptions} /></div>
          </article>
        </section>

        <section className={styles.section}>
          <PanelHeader
            kicker="02 / ECONOMIST LENS"
            title="What the latest releases imply"
            note="Rules-based interpretation of volume, value, breadth and accommodation—not an investment recommendation."
          />
          <div className={styles.insightGrid}>
            {model.insights.map(insight => (
              <article className={`${styles.insight} ${styles[insight.tone]}`} key={insight.title}>
                <span>{insight.title}</span>
                <p>{insight.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <PanelHeader
            kicker="03 / SOURCE-MARKET BREADTH"
            title="Who is driving visitor demand?"
            note={`${payload.analysis.positiveMarkets}/${payload.analysis.marketCount} tracked markets positive YoY · top-four share ${payload.analysis.topFourShare.toFixed(1)}%`}
          />
          <div className={styles.splitGrid}>
            <article className={styles.panel}>
              <div className={styles.directionLegend} aria-label="Bar color legend">
                <span><i className={styles.growthDot} /> YoY growth</span>
                <span><i className={styles.declineDot} /> YoY decline</span>
              </div>
              <div className={styles.marketChart}><Bar data={marketChart} options={marketOptions} /></div>
            </article>
            <article className={`${styles.panel} ${styles.marketTable}`}>
              <div className={styles.tableHeader}><span>Market</span><span>Arrivals</span><span>Share</span><span>YoY</span></div>
              {model.topMarkets.map(market => (
                <div key={market.name}>
                  <strong>{market.name}</strong>
                  <span>{compact(market.value)}</span>
                  <span>{market.share.toFixed(1)}%</span>
                  <b className={market.yoy >= 0 ? styles.up : styles.down}>{percent(market.yoy)}</b>
                </div>
              ))}
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <PanelHeader
            kicker="04 / VALUE CAPTURE"
            title="Travel spending composition"
            note="Tourist expenditure is an important services-export channel, but it is not conceptually identical to the balance-of-payments travel credit."
          />
          <div className={styles.valueGrid}>
            <article className={`${styles.panel} ${styles.doughnutPanel}`}>
              <div className={styles.doughnutChart}><Doughnut data={spendingChart} options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '64%',
                plugins: {
                  legend: { position: 'bottom', labels: { color: COLORS.muted, usePointStyle: true, boxWidth: 8, font: { size: 9 } } },
                  tooltip: { backgroundColor: '#142b3c', callbacks: { label: context => `${context.label}: ${yen(context.parsed)}` } },
                },
              }} /></div>
              <div className={styles.doughnutCenter}>
                <span>Total</span>
                <strong>{yen(model.spendingTotal)}</strong>
                <small>{model.spending.period}</small>
              </div>
            </article>
            <article className={`${styles.panel} ${styles.spendTable}`}>
              {model.spending.categories.map(item => {
                const share = item.valueYen / model.spendingTotal * 100
                return (
                  <div key={item.name}>
                    <span>{item.name}</span>
                    <div><i style={{ width: `${Math.max(share, 1)}%` }} /></div>
                    <strong>{yen(item.valueYen)}</strong>
                    <b>{share.toFixed(1)}%</b>
                  </div>
                )
              })}
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <PanelHeader
            kicker="05 / ACCOMMODATION TRANSMISSION"
            title="Foreign guest nights and capacity use"
            note={`${model.accommodation.status}; values may be revised in the second preliminary release.`}
          />
          <div className={styles.accommodationGrid}>
            <MetricCard
              label="Foreign guest nights"
              value={compact(model.accommodation.foreignGuestNights)}
              detail={`${percent(model.accommodation.foreignYoy)} YoY`}
              period={monthLabel(model.accommodation.period)}
              tone={toneFor(model.accommodation.foreignYoy)}
            />
            <MetricCard
              label="Total guest nights"
              value={compact(model.accommodation.totalGuestNights)}
              detail={`${percent(model.accommodation.totalYoy)} YoY`}
              period={monthLabel(model.accommodation.period)}
              tone={toneFor(model.accommodation.totalYoy)}
            />
            <MetricCard
              label="Room occupancy"
              value={Number.isFinite(model.accommodation.occupancyRate)
                ? `${model.accommodation.occupancyRate.toFixed(1)}%`
                : '—'}
              detail={Number.isFinite(model.accommodation.occupancyChange)
                ? `${model.accommodation.occupancyChange > 0 ? '+' : ''}${model.accommodation.occupancyChange.toFixed(1)}pp YoY`
                : 'YoY available with detailed release'}
              period="All facilities"
              tone={toneFor(model.accommodation.occupancyChange)}
            />
            <article className={styles.methodNote}>
              <span>Comparability break</span>
              <p>
                From January 2026, the Tourism Agency changed the accommodation survey&apos;s
                stratification variable from employee count to room count. Reported YoY changes
                may therefore include a methodology effect.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <PanelHeader kicker="06 / RELEASE LADDER" title="How to monitor the cycle" />
          <div className={styles.releaseGrid}>
            <article><b>1</b><span>Visitor arrivals</span><p>Monthly, fastest volume signal. Check total growth and source-market breadth.</p></article>
            <article><b>2</b><span>Accommodation</span><p>Monthly, shows whether arrivals translate into overnight demand and capacity use.</p></article>
            <article><b>3</b><span>Inbound spending</span><p>Quarterly, converts visitor flow into value, mix and services-export demand.</p></article>
          </div>
        </section>

        <section className={`${styles.section} ${styles.methodology}`}>
          <PanelHeader kicker="METHODOLOGY / SOURCES" title="Definitions and live-data status" />
          <div className={styles.sourceGrid}>
            {payload.meta.sources.map(source => (
              <article key={source.key}>
                <div><i className={source.live ? styles.live : styles.fallback} /><strong>{source.label}</strong></div>
                <p>{source.live ? 'Latest official workbook parsed automatically.' : 'Official preserved snapshot shown; the source workbook could not be parsed on this refresh.'}</p>
                {!source.live && source.error ? <small className={styles.sourceError}>{source.error}</small> : null}
                <a href={source.pageUrl} rel="noreferrer" target="_blank">Open official source ↗</a>
              </article>
            ))}
          </div>
          <p className={styles.definition}>
            Visitor arrivals count foreign travelers entering Japan under the JNTO definition.
            Inbound spending covers visitors for tourism, business and visiting friends or relatives;
            Japan residents are excluded. Figures may be estimates and are revised by the publishing agency.
          </p>
        </section>
      </div>
    </main>
  )
}
