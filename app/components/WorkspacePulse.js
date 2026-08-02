'use client'

import { useEffect, useState } from 'react'

const last = series => Array.isArray(series) && series.length ? series[series.length - 1] : null

function signed(value, digits = 1, suffix = '') {
  if (!Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`
}

function tone(value, inverse = false) {
  if (!Number.isFinite(value) || value === 0) return 'neutral'
  const positive = inverse ? value < 0 : value > 0
  return positive ? 'positive' : 'negative'
}

async function fetchJson(path, signal) {
  const response = await fetch(path, { signal })
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  const payload = await response.json()
  if (payload?.error) throw new Error(payload.error)
  return payload
}

function japanReadings([cpi, gdp, wages]) {
  const headline = last(cpi.headline)
  const headlinePrior = cpi.headline?.at(-2)
  const gdpQoq = last(gdp.gdp_qoq)
  const realWage = last(wages.real)

  return [
    {
      label: 'Headline CPI',
      value: headline ? `${headline.value.toFixed(1)}%` : '—',
      change: headline && headlinePrior
        ? `${signed(headline.value - headlinePrior.value, 1, 'pp')} vs prior`
        : 'Year-over-year',
      period: headline?.date,
      tone: tone(headline && headlinePrior ? headline.value - headlinePrior.value : null),
    },
    {
      label: 'Real GDP',
      value: gdpQoq ? `${signed(gdpQoq.value, 1, '%')}` : '—',
      change: 'Quarter-over-quarter',
      period: gdpQoq?.date,
      tone: tone(gdpQoq?.value),
    },
    {
      label: 'Real wages',
      value: Number.isFinite(realWage?.yoy) ? `${signed(realWage.yoy, 1, '%')}` : '—',
      change: 'Year-over-year',
      period: realWage?.date,
      tone: tone(realWage?.yoy),
    },
  ]
}

function yearAgoValue(observations, current) {
  if (!current?.date) return null
  const target = `${Number(current.date.slice(0, 4)) - 1}${current.date.slice(4)}`
  return observations.find(item => item.date === target && Number.isFinite(item.value))?.value ?? null
}

function usReadings([cpi, employment]) {
  const headlineObs = cpi.series?.headline?.observations?.filter(item => Number.isFinite(item.value)) ?? []
  const headline = last(headlineObs)
  const headlineYearAgo = yearAgoValue(headlineObs, headline)
  const headlineYoy = headline && headlineYearAgo
    ? (headline.value / headlineYearAgo - 1) * 100
    : null

  const payrolls = employment.employment?.payems ?? []
  const payrollLatest = last(payrolls)
  const payrollPrior = payrolls.at(-2)
  const payrollChange = payrollLatest && payrollPrior
    ? payrollLatest.value - payrollPrior.value
    : null
  const unemployment = last(employment.employment?.unrate)

  return [
    {
      label: 'Headline CPI',
      value: Number.isFinite(headlineYoy) ? `${headlineYoy.toFixed(1)}%` : '—',
      change: 'Year-over-year',
      period: headline?.date?.slice(0, 7),
      tone: tone(headlineYoy),
    },
    {
      label: 'Nonfarm payrolls',
      value: Number.isFinite(payrollChange) ? `${signed(payrollChange, 0, 'K')}` : '—',
      change: 'Monthly change',
      period: payrollLatest?.date?.slice(0, 7),
      tone: tone(payrollChange),
    },
    {
      label: 'Unemployment',
      value: unemployment ? `${unemployment.value.toFixed(1)}%` : '—',
      change: 'U-3 · seasonally adjusted',
      period: unemployment?.date?.slice(0, 7),
      tone: tone(unemployment?.value, true),
    },
  ]
}

export default function WorkspacePulse({ countryCode }) {
  const [readings, setReadings] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const paths = countryCode === 'JP'
      ? ['/api/cpi', '/api/gdp', '/api/wages']
      : ['/api/us-cpi', '/api/us-employment']

    Promise.all(paths.map(path => fetchJson(path, controller.signal)))
      .then(payloads => setReadings(countryCode === 'JP' ? japanReadings(payloads) : usReadings(payloads)))
      .catch(error => {
        if (error.name !== 'AbortError') setReadings([])
      })

    return () => controller.abort()
  }, [countryCode])

  if (Array.isArray(readings) && readings.length === 0) return null

  return (
    <section className="workspace-pulse" aria-label="Latest macro readings">
      <header className="workspace-pulse__header">
        <div>
          <span>Current pulse</span>
          <strong>Latest official readings</strong>
        </div>
        <small>{readings ? 'Cached · auto-updated' : 'Connecting to official sources…'}</small>
      </header>
      <div className="workspace-pulse__grid">
        {(readings || [null, null, null]).map((reading, index) => (
          <div className={`workspace-pulse__item${reading ? ` is-${reading.tone}` : ' is-loading'}`} key={reading?.label || index}>
            {reading ? (
              <>
                <span>{reading.label}</span>
                <strong>{reading.value}</strong>
                <footer>
                  <span>{reading.change}</span>
                  <time>{reading.period || 'Latest'}</time>
                </footer>
              </>
            ) : (
              <>
                <span>Loading indicator</span>
                <strong>—</strong>
                <footer><span>Official source</span></footer>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
