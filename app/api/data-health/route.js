export const dynamic = 'force-dynamic'

const last = values => Array.isArray(values) && values.length ? values.at(-1) : null
const observationDate = series => last(series?.filter(item => item?.date))?.date ?? null
const fredDate = payload => observationDate(payload?.observations)

const DEFINITIONS = {
  JP: [
    { key: 'jp-cpi', label: 'National CPI', href: '/cpi', path: '/api/cpi', cadence: 'Monthly', maxAge: 100, source: 'MIC · e-Stat', extract: data => observationDate(data?.headline) },
    { key: 'jp-ppi', label: 'CGPI / SPPI', href: '/ppi', path: '/api/ppi', cadence: 'Monthly', maxAge: 100, source: 'BOJ', extract: data => observationDate(data?.cgpi) },
    {
      key: 'jp-boj-policy',
      label: 'BOJ Policy Monitor',
      href: '/boj-policy',
      path: '/api/boj-policy',
      cadence: 'Monthly / Quarterly',
      maxAge: 240,
      source: 'BOJ research data',
      extract: data => data?.latest?.coreInflation ?? data?.latest?.activity ?? null,
      describe: data => data?.meta?.partial
        ? `Partial official workbook refresh: ${(data.meta.warnings || []).join(' · ')}`
        : 'Underlying inflation, output gap and labor-market workbooks parsed automatically.',
    },
    {
      key: 'jp-yen-transmission',
      label: 'Yen & External Costs',
      href: '/yen-transmission',
      path: '/api/yen-transmission',
      cadence: 'Daily / Monthly',
      maxAge: 45,
      source: 'BOJ Time-Series API',
      extract: data => data?.latest?.usdJpy?.date ?? data?.latest?.reer?.date ?? null,
    },
    { key: 'jp-gdp', label: 'GDP', href: '/gdp', path: '/api/gdp', cadence: 'Quarterly', maxAge: 240, source: 'Cabinet Office', extract: data => observationDate(data?.gdp_qoq) },
    {
      key: 'jp-iip',
      label: 'Industrial Production',
      href: '/iip',
      path: '/api/iip',
      cadence: 'Reference snapshot',
      maxAge: 110,
      source: 'METI · e-Stat',
      mode: 'SNAPSHOT',
      reference: true,
      referenceMessage: 'February reference snapshot is intentionally preserved because the source file identifier cannot be advanced reliably by API.',
      extract: data => observationDate(data?.['鉱工業']),
    },
    { key: 'jp-tsip', label: 'Tertiary Activity', href: '/tsip', path: '/api/tsip', cadence: 'Monthly', maxAge: 110, source: 'METI · e-Stat', extract: data => data?.latest?.date ?? null },
    { key: 'jp-machinery', label: 'Machine Orders', href: '/machine-orders', path: '/api/machine-orders', cadence: 'Monthly', maxAge: 110, source: 'Cabinet Office', extract: data => data?.latest?.date ?? null },
    { key: 'jp-consumption', label: 'Household Consumption', href: '/consumption', path: '/api/consumption', cadence: 'Monthly', maxAge: 110, source: 'MIC · e-Stat', extract: data => observationDate(data?.total) },
    { key: 'jp-tankan', label: 'BOJ Tankan', href: '/tankan', path: '/api/tankan', cadence: 'Quarterly', maxAge: 240, source: 'BOJ', extract: data => observationDate(data?.large_mfg) },
    { key: 'jp-watchers', label: 'Economy Watchers', href: '/watcher', path: '/api/watcher', cadence: 'Monthly', maxAge: 100, source: 'Cabinet Office', extract: data => observationDate(data?.current_all) },
    { key: 'jp-wages', label: 'Wages', href: '/wages', path: '/api/wages', cadence: 'Monthly', maxAge: 110, source: 'MHLW', extract: data => data?.latest_date ?? observationDate(data?.nominal) },
    { key: 'jp-labour', label: 'Labor Force', href: '/labour', path: '/api/labour', cadence: 'Monthly', maxAge: 100, source: 'MIC · e-Stat', extract: data => observationDate(data?.data) },
    { key: 'jp-job-ratio', label: 'Job-to-Applicant Ratio', href: '/job-ratio', path: '/api/job-ratio', cadence: 'Monthly', maxAge: 100, source: 'MHLW · e-Stat', extract: data => data?.latest?.date ?? null },
    {
      key: 'jp-trade',
      label: 'Trade Statistics',
      href: '/trade',
      path: '/api/trade',
      cadence: 'Monthly',
      maxAge: 110,
      source: 'MOF · Customs / e-Stat',
      mode: 'HYBRID',
      extract: data => observationDate(data?.export?.total),
      describe: data => data?._meta?.detailLatest
        ? `Headline totals auto-update from Japan Customs; country and product detail is a ${data._meta.detailLatest} reference snapshot.`
        : null,
    },
    {
      key: 'jp-inbound-tourism',
      label: 'Inbound Tourism',
      href: '/inbound-tourism',
      path: '/api/inbound-tourism',
      cadence: 'Monthly / Quarterly',
      maxAge: 100,
      source: 'JNTO · Japan Tourism Agency',
      mode: 'HYBRID',
      extract: data => data?.arrivalSummary?.period ?? null,
      describe: data => {
        const sources = data?.meta?.sources || []
        const fallbackCount = sources.filter(source => !source.live).length
        return fallbackCount
          ? `${sources.length - fallbackCount}/${sources.length} official workbooks parsed live; preserved official snapshots cover unavailable files.`
          : 'Arrivals, spending and accommodation workbooks parsed live from official publishers.'
      },
    },
  ],
  US: [
    { key: 'us-cpi', label: 'Consumer Price Index', href: '/us/cpi', path: '/api/us-cpi', cadence: 'Monthly', maxAge: 100, source: 'BLS · FRED', extract: data => fredDate(data?.series?.headline) },
    { key: 'us-ppi', label: 'Producer Price Index', href: '/us/ppi', path: '/api/us-ppi', cadence: 'Monthly', maxAge: 100, source: 'BLS · FRED', extract: data => fredDate(data?.series?.headline) },
    {
      key: 'us-pce',
      label: 'PCE, Income & Dining Demand',
      href: '/us/consumption',
      path: '/api/us-consumption',
      cadence: 'Monthly',
      maxAge: 100,
      source: 'BEA · Census · BLS · FRED',
      extract: data => fredDate(data?.series?.headlinePce),
      describe: data => data?.meta?.partial
        ? `Core PCE data are current; optional dining detail is partial: ${(data.meta.warnings || []).join(' · ')}`
        : 'PCE, income, restaurant sales and dining-price data loaded from official sources.',
    },
    { key: 'us-growth', label: 'GDP & Retail Sales', href: '/us-macro#growth', path: '/api/us-macro', cadence: 'Quarterly / Monthly', maxAge: 240, source: 'BEA · Census · FRED', extract: data => observationDate(data?.growth?.realGdpGrowth) },
    { key: 'us-manufacturing', label: 'Manufacturing Surveys', href: '/us/manufacturing', path: '/api/us-manufacturing', cadence: 'Monthly', maxAge: 100, source: 'NY Fed · Philly Fed · ISM', mode: 'MIXED', extract: data => observationDate(data?.ism?.headline) },
    {
      key: 'us-sentiment',
      label: 'Michigan Consumer Sentiment',
      href: '/us/sentiment',
      path: '/api/us-sentiment',
      cadence: 'Monthly · one-month public lag',
      maxAge: 140,
      source: 'University of Michigan · FRED',
      mode: 'AUTO · DELAYED',
      previewSeriesId: 'UMCSENT',
      extract: data => fredDate(data?.series?.sentiment),
      describe: data => data?.availability?.lag || null,
    },
    { key: 'us-employment', label: 'Employment Situation', href: '/us/employment', path: '/api/us-employment', cadence: 'Monthly', maxAge: 100, source: 'BLS · FRED', extract: data => observationDate(data?.employment?.payems) },
    { key: 'us-claims', label: 'Initial Claims', href: '/us/initial-claims', path: '/api/us-initial-claims', cadence: 'Weekly', maxAge: 21, source: 'ETA · FRED', extract: data => fredDate(data?.series?.initialClaims) },
    { key: 'us-jolts', label: 'JOLTS', href: '/us/jolts', path: '/api/us-jolts', cadence: 'Monthly', maxAge: 110, source: 'BLS · FRED', extract: data => fredDate(data?.series?.openings) },
    { key: 'us-rates', label: 'Rates & Financial Conditions', href: '/us/rates', path: '/api/us-rates', cadence: 'Daily / Weekly', maxAge: 14, source: 'Federal Reserve · Treasury · FRED', extract: data => data?.latest?.date ?? data?.latest?.nfci?.date ?? null },
  ],
}

function parsePeriod(value) {
  if (!value) return null
  const text = String(value).trim()
  const quarter = text.match(/^(\d{4})[/-]Q([1-4])$/i)
  if (quarter) {
    const month = Number(quarter[2]) * 3
    return new Date(Date.UTC(Number(quarter[1]), month, 0, 12))
  }
  const normalized = text.replace(/\//g, '-')
  if (/^\d{4}-\d{2}$/.test(normalized)) return new Date(`${normalized}-01T12:00:00Z`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return new Date(`${normalized}T12:00:00Z`)
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function freshness(latestPeriod, maxAge) {
  const observed = parsePeriod(latestPeriod)
  if (!observed) return { status: 'failed', ageDays: null, message: 'Latest observation date is unavailable' }
  const ageDays = Math.max(0, Math.floor((Date.now() - observed.getTime()) / 86400000))
  if (ageDays > maxAge) {
    return { status: 'stale', ageDays, message: `Latest observation is ${ageDays} days old` }
  }
  return { status: 'current', ageDays, message: 'Within the expected publication window' }
}

async function fetchWithTimeout(url, milliseconds = 30000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), milliseconds)
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    if (payload?.error) throw new Error(payload.error)
    return payload
  } finally {
    clearTimeout(timeout)
  }
}

async function previewFredDate(seriesId) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`,
      { cache: 'no-store', signal: controller.signal },
    )
    if (!response.ok) throw new Error(`FRED preview probe returned HTTP ${response.status}`)
    const rows = (await response.text())
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map(row => row.split(','))
      .filter(([date, value]) => date && value && value !== '.')
    return rows.at(-1)?.[0] ?? null
  } finally {
    clearTimeout(timeout)
  }
}

async function inspectSource(origin, definition) {
  const checkedAt = new Date().toISOString()
  try {
    const payload = await fetchWithTimeout(`${origin}${definition.path}`)
    const latestPeriod = definition.extract(payload)
    const detailMessage = definition.describe?.(payload) || null
    const fresh = definition.reference
      ? {
          status: 'reference',
          ageDays: null,
          message: definition.referenceMessage,
        }
      : freshness(latestPeriod, definition.maxAge)
    return {
      ...definition,
      extract: undefined,
      describe: undefined,
      previewSeriesId: undefined,
      reference: undefined,
      referenceMessage: undefined,
      mode: definition.mode || 'AUTO',
      latestPeriod,
      checkedAt,
      ...fresh,
      message: detailMessage || fresh.message,
    }
  } catch (error) {
    if (process.env.VERCEL_ENV === 'preview' && definition.previewSeriesId) {
      try {
        const latestPeriod = await previewFredDate(definition.previewSeriesId)
        const fresh = freshness(latestPeriod, definition.maxAge)
        return {
          ...definition,
          extract: undefined,
          describe: undefined,
          previewSeriesId: undefined,
          mode: definition.mode || 'AUTO',
          latestPeriod,
          checkedAt,
          ...fresh,
          message: 'Preview verified against the same public FRED series; production monitors the JapanPulse endpoint after merge.',
        }
      } catch {
        // Fall through to the endpoint failure below when the public probe also fails.
      }
    }
    return {
      ...definition,
      extract: undefined,
      describe: undefined,
      previewSeriesId: undefined,
      reference: undefined,
      referenceMessage: undefined,
      mode: definition.mode || 'AUTO',
      latestPeriod: null,
      checkedAt,
      status: 'failed',
      ageDays: null,
      message: error.name === 'AbortError' ? 'Health check timed out' : error.message,
    }
  }
}

export async function GET(request) {
  const country = new URL(request.url).searchParams.get('country')?.toUpperCase()
  if (!DEFINITIONS[country]) {
    return Response.json({ error: 'country must be JP or US' }, { status: 400 })
  }

  // Preview deployments are protected by Vercel Authentication. A server-side
  // request back to the preview host has no browser SSO cookie and receives a
  // redirect instead of JSON, so use the project's public production host for
  // preview health checks. Production and local development remain self-checks.
  const origin = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : new URL(request.url).origin
  const items = await Promise.all(DEFINITIONS[country].map(definition => inspectSource(origin, definition)))
  const summary = items.reduce((counts, item) => {
    counts[item.status] += 1
    return counts
  }, { current: 0, reference: 0, stale: 0, failed: 0 })

  return Response.json({
    country,
    checkedAt: new Date().toISOString(),
    automatic: true,
    summary,
    items,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  })
}
