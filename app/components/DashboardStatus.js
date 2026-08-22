'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { officialSourcesForPath } from '../lib/official-sources.mjs'

const PERIOD_KEYS = new Set(['date', 'period', 'month', 'quarter', 'observation_date'])

function parsePeriod(value) {
  if (typeof value !== 'string') return null

  let match = value.match(/^(\d{4})[-/](\d{2})(?:[-/](\d{2}))?$/)
  if (match) {
    const [, year, month, day = '01'] = match
    return {
      rank: Number(year) * 10000 + Number(month) * 100 + Number(day),
      label: `${year}-${month}${match[3] ? `-${day}` : ''}`,
    }
  }

  match = value.match(/^(\d{4})[ -]?Q([1-4])$/i)
  if (match) {
    const [, year, quarter] = match
    return {
      rank: Number(year) * 10000 + Number(quarter) * 300 + 1,
      label: `${year} Q${quarter}`,
    }
  }

  match = value.match(/^(\d{4})年\s*(\d{1,2})月/)
  if (match) {
    const [, year, month] = match
    return {
      rank: Number(year) * 10000 + Number(month) * 100 + 1,
      label: `${year}-${String(month).padStart(2, '0')}`,
    }
  }

  return null
}

function findLatestPeriod(data) {
  let latest = null
  let visited = 0
  const stack = [{ value: data, key: '' }]

  while (stack.length && visited < 25000) {
    const { value, key } = stack.pop()
    visited += 1

    if (typeof value === 'string' && PERIOD_KEYS.has(key)) {
      const period = parsePeriod(value)
      if (period && (!latest || period.rank > latest.rank)) latest = period
      continue
    }

    if (!value || typeof value !== 'object') continue

    if (Array.isArray(value)) {
      for (const item of value) stack.push({ value: item, key })
      continue
    }

    for (const [childKey, childValue] of Object.entries(value)) {
      if (childKey === 'fetchedAt' || childKey === 'updatedAt') continue
      if (childKey.toLowerCase().includes('forecast') || childKey.toLowerCase() === 'sep') continue
      stack.push({ value: childValue, key: childKey })
    }
  }

  return latest?.label ?? null
}

function findLatestFetchTime(data) {
  let latest = null
  let visited = 0
  const stack = [data]

  while (stack.length && visited < 5000) {
    const value = stack.pop()
    visited += 1
    if (!value || typeof value !== 'object') continue

    if (Array.isArray(value)) {
      for (const item of value) stack.push(item)
      continue
    }

    for (const [key, childValue] of Object.entries(value)) {
      if (typeof childValue === 'string' && ['fetchedAt', 'updatedAt', 'checkedAt', 'generatedAt'].includes(key)) {
        const timestamp = Date.parse(childValue)
        if (Number.isFinite(timestamp) && (!latest || timestamp > latest)) latest = timestamp
      } else if (childValue && typeof childValue === 'object') {
        stack.push(childValue)
      }
    }
  }

  return latest
    ? new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      }).format(new Date(latest))
    : null
}

export function DashboardFreshness({ data, source = 'Official source', mode = 'auto' }) {
  const pathname = usePathname()
  const latestPeriod = useMemo(() => findLatestPeriod(data), [data])
  const fetchedAt = useMemo(() => findLatestFetchTime(data), [data])
  const officialSources = officialSourcesForPath(pathname)

  return (
    <div className="dashboard-freshness" aria-label="Data status">
      <span className="dashboard-freshness__source">{source}</span>
      {officialSources.length ? (
        <span className="dashboard-freshness__links">
          <span>Official</span>
          {officialSources.map(item => (
            <a href={item.url} key={item.url} rel="noopener noreferrer" target="_blank">
              {item.label} ↗
            </a>
          ))}
        </span>
      ) : null}
      {latestPeriod ? <span>Latest observation · {latestPeriod}</span> : null}
      {fetchedAt ? <span>Retrieved · {fetchedAt}</span> : null}
      <span>{mode === 'reference' ? 'Preserved reference snapshot' : 'Updated automatically'}</span>
    </div>
  )
}

export function DashboardState({ type = 'loading', message }) {
  const isError = type === 'error'
  const [isSlow, setIsSlow] = useState(false)
  const [isDelayed, setIsDelayed] = useState(false)

  useEffect(() => {
    if (isError) return undefined
    const slowTimer = window.setTimeout(() => setIsSlow(true), 8000)
    const delayedTimer = window.setTimeout(() => setIsDelayed(true), 18000)
    return () => {
      window.clearTimeout(slowTimer)
      window.clearTimeout(delayedTimer)
    }
  }, [isError])

  const fallbackMessage = isDelayed
    ? 'The official source did not complete within the normal window. Other dashboards remain available while this request continues.'
    : isSlow
    ? 'The official source is taking longer than usual. This page will continue trying.'
    : 'Connecting to the official source…'

  return (
    <main className={`dashboard-state dashboard-state--${isDelayed ? 'delayed' : type}`} role={isError ? 'alert' : 'status'}>
      <span className="dashboard-state__mark" aria-hidden="true">{isError ? '!' : isDelayed ? '…' : '•••'}</span>
      <div>
        <strong>{isError ? 'Data unavailable' : isDelayed ? 'Official source delayed' : 'Loading official data'}</strong>
        <p>{message || (isError ? 'The source did not return usable data.' : fallbackMessage)}</p>
        {(isError || isDelayed) ? <Link href="/status">Check feed status →</Link> : null}
      </div>
    </main>
  )
}
