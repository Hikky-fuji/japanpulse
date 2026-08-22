'use client'

import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  annualizeMonthlyRate,
  baseEffectCalendar,
  buildScenarioSet,
  historicalYoy,
  nextMonthHurdles,
  scenarioSummary,
} from '../../lib/us-cpi-scenarios.mjs'
import styles from './page.module.css'

const BASE_RATES = [0.2, 0.3, 0.4]
const SCENARIO_COLORS = ['#66c2a5', '#f2a65a', '#ef6a68', '#8ba9ff']

const finite = value => Number.isFinite(value)
const signed = (value, digits = 2, suffix = '%') => finite(value)
  ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`
  : '—'
const percent = (value, digits = 1) => finite(value) ? `${value.toFixed(digits)}%` : '—'

function monthLabel(date, includeYear = false) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`))
}

function uniqueRates(customRate) {
  const rates = [...BASE_RATES]
  if (finite(customRate) && customRate >= -1 && customRate <= 2 && !rates.some(rate => Math.abs(rate - customRate) < 0.001)) {
    rates.push(customRate)
  }
  return rates
}

function scenarioChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 7,
          color: '#d5dade',
          font: { size: 10 },
        },
      },
      tooltip: {
        backgroundColor: '#142b3c',
        padding: 10,
        filter: context => finite(context.parsed.y),
        callbacks: {
          label: context => `${context.dataset.label}: ${percent(context.parsed.y, 2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 13, color: '#bac1c6', font: { size: 9 } },
      },
      y: {
        grid: { color: '#495157' },
        ticks: { color: '#bac1c6', font: { size: 9 }, callback: value => `${value}%` },
        title: { display: true, text: 'Y/Y', color: '#9da7ad', font: { size: 9 } },
      },
    },
  }
}

function ScenarioCard({ scenario, color }) {
  const summary = scenarioSummary(scenario)
  const crossing = summary?.firstAtOrBelow
  return (
    <article className={styles.scenarioCard} style={{ '--scenario-color': color }}>
      <div className={styles.scenarioCardTop}>
        <strong>{scenario.monthlyRate.toFixed(2)}% M/M</strong>
        <span>{percent(scenario.annualizedRate, 1)} annualized</span>
      </div>
      <div className={styles.scenarioMetrics}>
        <div><span>Year-end</span><strong>{percent(summary?.yearEnd?.yoy)}</strong></div>
        <div><span>12M endpoint</span><strong>{percent(summary?.final?.yoy)}</strong></div>
        <div>
          <span>First month ≤ 2.5%</span>
          <strong>{crossing ? monthLabel(crossing.date, true) : 'Not in horizon'}</strong>
        </div>
      </div>
    </article>
  )
}

export default function CpiScenarioLab({ series }) {
  const [seriesKey, setSeriesKey] = useState('core')
  const [customInput, setCustomInput] = useState('0.25')
  const [focusRate, setFocusRate] = useState(0.2)

  const customRate = customInput.trim() === '' ? Number.NaN : Number(customInput)
  const validCustomRate = finite(customRate) && customRate >= -1 && customRate <= 2
  const observations = series?.[seriesKey]?.observations || []

  const model = useMemo(() => {
    const rates = uniqueRates(customRate)
    const scenarios = buildScenarioSet(observations, rates, 12)
    const actual = historicalYoy(observations).slice(-36)
    const futureDates = scenarios[0]?.points.map(point => point.date) || []
    const labels = [...actual.map(point => monthLabel(point.date, true)), ...futureDates.map(date => monthLabel(date, true))]
    const actualValues = [...actual.map(point => point.value), ...futureDates.map(() => null)]
    const currentYoy = actual.at(-1)?.value

    const chartData = {
      labels,
      datasets: [
        {
          label: `${series?.[seriesKey]?.label || 'CPI'} actual`,
          data: actualValues,
          borderColor: '#dfe5e8',
          backgroundColor: '#dfe5e8',
          borderWidth: 2.4,
          pointRadius: 0,
          spanGaps: false,
        },
        ...scenarios.map((scenario, index) => ({
          label: `${scenario.monthlyRate.toFixed(2)}% M/M`,
          data: [
            ...actual.slice(0, -1).map(() => null),
            currentYoy,
            ...scenario.points.map(point => point.yoy),
          ],
          borderColor: SCENARIO_COLORS[index],
          backgroundColor: SCENARIO_COLORS[index],
          borderWidth: index < 3 ? 2.1 : 1.7,
          borderDash: index < 3 ? [7, 4] : [3, 4],
          pointRadius: 0,
          spanGaps: false,
        })),
        {
          label: '2% reference',
          data: labels.map(() => 2),
          borderColor: '#69737a',
          borderWidth: 1,
          borderDash: [2, 5],
          pointRadius: 0,
        },
      ],
    }

    const focused = scenarios.find(scenario => Math.abs(scenario.monthlyRate - focusRate) < 0.001) || scenarios[0]
    const baseEffects = baseEffectCalendar(observations, focused?.monthlyRate ?? 0.2, 6)
    const hurdles = nextMonthHurdles(observations)
    const missingBases = scenarios[0]?.points.filter(point => point.missingBase).map(point => point.date) || []
    const low = scenarios.find(scenario => Math.abs(scenario.monthlyRate - 0.2) < 0.001)
    const middle = scenarios.find(scenario => Math.abs(scenario.monthlyRate - 0.3) < 0.001)
    const yearEndSpread = scenarioSummary(low)?.yearEnd && scenarioSummary(middle)?.yearEnd
      ? scenarioSummary(middle).yearEnd.yoy - scenarioSummary(low).yearEnd.yoy
      : null

    return { scenarios, chartData, baseEffects, hurdles, missingBases, yearEndSpread, focused }
  }, [customRate, observations, series, seriesKey, focusRate])

  return (
    <section className={styles.section} id="scenario-lab">
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionKicker}>Scenario lab</div>
          <h2>What if the monthly pace persists?</h2>
        </div>
        <p>Mechanical paths calculated from the latest official seasonally adjusted index. These are scenarios, not forecasts.</p>
      </div>

      <div className={styles.scenarioToolbar}>
        <div className={styles.segmented} role="group" aria-label="Select CPI measure">
          {['headline', 'core'].map(key => (
            <button
              className={seriesKey === key ? styles.segmentActive : ''}
              key={key}
              onClick={() => setSeriesKey(key)}
              aria-pressed={seriesKey === key}
              type="button"
            >
              {key === 'headline' ? 'Headline CPI' : 'Core CPI'}
            </button>
          ))}
        </div>
        <label className={styles.customRate}>
          <span>Custom monthly pace</span>
          <span className={styles.customRateInput}>
            <input
              aria-label="Custom monthly CPI rate"
              inputMode="decimal"
              max="2"
              min="-1"
              onChange={event => setCustomInput(event.target.value)}
              step="0.05"
              type="number"
              value={customInput}
            />
            <b>%</b>
          </span>
          <small>{validCustomRate ? `${percent(annualizeMonthlyRate(customRate), 1)} annualized` : 'Use −1.00% to 2.00%'}</small>
        </label>
      </div>

      <div className={styles.scenarioGrid}>
        {model.scenarios.map((scenario, index) => (
          <ScenarioCard key={scenario.monthlyRate} scenario={scenario} color={SCENARIO_COLORS[index]} />
        ))}
      </div>

      <div className={styles.scenarioLayout}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>{series?.[seriesKey]?.label} conditional path</h3>
          <p className={styles.panelSub}>Year-over-year rate · actual history and 12-month scenario horizon</p>
          <div className={styles.scenarioChart}>
            <Line data={model.chartData} options={scenarioChartOptions()} />
          </div>
          {model.missingBases.length ? (
            <p className={styles.chartFootnote}>
              The projected line remains blank in {model.missingBases.map(date => monthLabel(date, true)).join(', ')} because the official year-ago comparison is unavailable. No value is interpolated.
            </p>
          ) : null}
        </div>

        <aside className={styles.hurdlePanel}>
          <div className={styles.cardLabel}>Next-month hurdle</div>
          <h3>{monthLabel(model.hurdles?.nextDate, true)}</h3>
          <p>Monthly CPI needed to change the current Y/Y rate.</p>
          <div className={styles.hurdleList}>
            <div><span>Hold Y/Y unchanged</span><strong>{signed(model.hurdles?.hold)}</strong></div>
            <div><span>Lower Y/Y by 0.1pp</span><strong>{signed(model.hurdles?.downTenth)}</strong></div>
            <div><span>Raise Y/Y by 0.1pp</span><strong>{signed(model.hurdles?.upTenth)}</strong></div>
          </div>
          <div className={styles.scenarioReadout}>
            <strong>0.2% vs 0.3%</strong>
            <span>
              One tenth per month compounds to roughly 1.2pp over a year.
              {finite(model.yearEndSpread) ? ` The current year-end path differs by ${model.yearEndSpread.toFixed(1)}pp.` : ''}
            </span>
          </div>
        </aside>
      </div>

      <div className={styles.baseEffectPanel}>
        <div className={styles.baseEffectHeader}>
          <div>
            <div className={styles.cardLabel}>Base-effect calendar</div>
            <h3>What rolls out of the annual comparison?</h3>
          </div>
          <div className={styles.rateSelector} role="group" aria-label="Select replacement monthly pace">
            {uniqueRates(customRate).map(rate => (
              <button
                className={Math.abs(model.focused?.monthlyRate - rate) < 0.001 ? styles.rateActive : ''}
                key={rate}
                onClick={() => setFocusRate(rate)}
                aria-pressed={Math.abs(model.focused?.monthlyRate - rate) < 0.001}
                type="button"
              >
                {rate.toFixed(2)}%
              </button>
            ))}
          </div>
        </div>
        <div className={styles.baseEffectTableWrap}>
          <table className={styles.baseEffectTable}>
            <thead>
              <tr><th>Projected month</th><th>Month rolling off</th><th>Rate rolling off</th><th>Replacement</th><th>Y/Y pressure</th></tr>
            </thead>
            <tbody>
              {model.baseEffects.map(row => (
                <tr key={row.date}>
                  <td>{monthLabel(row.date, true)}</td>
                  <td>{monthLabel(row.baseDate, true)}</td>
                  <td>{signed(row.rolloffRate)}</td>
                  <td>{signed(row.replacementRate)}</td>
                  <td><span className={`${styles.pressure} ${styles[`pressure_${row.direction}`]}`}>{row.direction === 'downward' ? 'Downward' : row.direction === 'upward' ? 'Upward' : row.direction === 'neutral' ? 'Neutral' : 'Unavailable'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.methodNote}>
          “Pressure” compares the selected replacement pace with the monthly rate dropping out of the 12-month calculation. It isolates base effects and does not account for category-specific shocks.
        </p>
      </div>
    </section>
  )
}
