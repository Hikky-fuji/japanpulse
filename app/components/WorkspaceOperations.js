'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`))
}

function daysUntil(value) {
  if (!value) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${value}T12:00:00`)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function StatusBadge({ status }) {
  return <b className={`operations-status is-${status}`}>{status.toUpperCase()}</b>
}

function HealthSummary({ health }) {
  if (!health) {
    return <div className="operations-loading">Checking official data feeds…</div>
  }
  const total = health.items.length
  return (
    <>
      <div className="operations-health__counts">
        <div className="is-current"><strong>{health.summary.current}</strong><span>Current</span></div>
        <div className="is-stale"><strong>{health.summary.stale}</strong><span>Stale</span></div>
        <div className="is-failed"><strong>{health.summary.failed}</strong><span>Failed</span></div>
      </div>
      <p>{total} official feeds checked automatically every 15 minutes.</p>
    </>
  )
}

function ReleaseRows({ events, limit }) {
  const visible = typeof limit === 'number' ? events.slice(0, limit) : events
  if (!visible.length) {
    return <div className="operations-loading">Loading official release schedules…</div>
  }
  return (
    <div className="operations-releases">
      {visible.map(item => {
        const countdown = daysUntil(item.date)
        return (
          <div className="operations-release" key={item.id}>
            <time dateTime={item.date}>
              <strong>{formatDate(item.date)}</strong>
              <span>{countdown === 0 ? 'TODAY' : countdown === 1 ? 'TOMORROW' : `${countdown}D`}</span>
            </time>
            <div>
              <Link href={item.href}>{item.label}</Link>
              <small>
                {item.country} · {item.period}
                {item.time ? ` · ${item.time} ${item.timeZone || ''}` : ''}
              </small>
            </div>
            <a href={item.sourceUrl} rel="noreferrer" target="_blank">{item.source} ↗</a>
          </div>
        )
      })}
    </div>
  )
}

export default function WorkspaceOperations({ countryCode, expanded = false }) {
  const countries = countryCode === 'ALL' ? ['JP', 'US'] : [countryCode]
  const [healthByCountry, setHealthByCountry] = useState({})
  const [calendar, setCalendar] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const requestCountries = countryCode === 'ALL' ? ['JP', 'US'] : [countryCode]

    fetch('/api/release-calendar', { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (active && payload && !payload.error) setCalendar(payload)
      })
      .catch(error => {
        if (error.name !== 'AbortError') console.error('[Release calendar]', error)
      })

    requestCountries.forEach(country => {
      fetch(`/api/data-health?country=${country}`, { signal: controller.signal })
        .then(response => response.ok ? response.json() : null)
        .then(payload => {
          if (!active || !payload || payload.error) return
          setHealthByCountry(current => ({ ...current, [country]: payload }))
        })
        .catch(error => {
          if (error.name !== 'AbortError') console.error(`[${country} data health]`, error)
        })
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [countryCode])

  const events = useMemo(() => {
    const all = calendar?.events || []
    return countryCode === 'ALL' ? all : all.filter(item => item.country === countryCode)
  }, [calendar, countryCode])

  if (expanded) {
    return (
      <div className="operations-dashboard">
        <section className="operations-dashboard__masthead">
          <span>DATA OPERATIONS</span>
          <h1>Data Status & Release Calendar</h1>
          <p>
            Live endpoint health, observation freshness and upcoming dates taken only from official published schedules.
          </p>
        </section>

        <section className="operations-dashboard__health">
          {countries.map(country => {
            const health = healthByCountry[country]
            return (
              <article key={country}>
                <header>
                  <div><span>{country}</span><h2>{country === 'JP' ? 'Japan data feeds' : 'United States data feeds'}</h2></div>
                  {health ? <small>Checked {new Date(health.checkedAt).toLocaleTimeString()}</small> : null}
                </header>
                <HealthSummary health={health} />
                {health ? (
                  <div className="operations-health__table">
                    {health.items.map(item => (
                      <Link href={item.href} key={item.key}>
                        <div>
                          <strong>{item.label}</strong>
                          <small>{item.source} · {item.cadence}</small>
                        </div>
                        <span>{item.latestPeriod || 'No observation date'}</span>
                        <b className={item.mode === 'MIXED' ? 'is-mixed' : ''}>{item.mode}</b>
                        <StatusBadge status={item.status} />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })}
        </section>

        <section className="operations-dashboard__calendar">
          <header>
            <div>
              <span>OFFICIAL CALENDAR</span>
              <h2>Next scheduled releases</h2>
            </div>
            <small>{calendar?.methodology || 'Connecting to official schedules…'}</small>
          </header>
          <ReleaseRows events={events} />
        </section>
      </div>
    )
  }

  const health = healthByCountry[countryCode]
  return (
    <section className="workspace-operations" aria-label={`${countryCode} data operations`}>
      <header className="workspace-operations__header">
        <div>
          <span>Data operations</span>
          <strong>Freshness & next releases</strong>
        </div>
        <Link href="/status">Open full monitor →</Link>
      </header>
      <div className="workspace-operations__grid">
        <article className="operations-health">
          <div className="workspace-operations__topline">
            <span>FEED HEALTH</span>
            <b>AUTO · 15M</b>
          </div>
          <HealthSummary health={health} />
        </article>
        <article>
          <div className="workspace-operations__topline">
            <span>NEXT RELEASES</span>
            <b>OFFICIAL · 6H</b>
          </div>
          <ReleaseRows events={events} limit={3} />
        </article>
      </div>
    </section>
  )
}
