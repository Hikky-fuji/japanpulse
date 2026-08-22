export const dynamic = 'force-dynamic'

const SOURCES = {
  JP: {
    cpi: '/api/cpi',
    yen: '/api/yen-transmission',
    gdp: '/api/gdp',
    iip: '/api/iip',
    consumption: '/api/consumption',
    watcher: '/api/watcher',
    labour: '/api/labour',
    jobRatio: '/api/job-ratio',
    wages: '/api/wages',
    trade: '/api/trade',
  },
  US: {
    cpi: '/api/us-cpi',
    ppi: '/api/us-ppi',
    employment: '/api/us-employment',
    consumption: '/api/us-consumption',
    jolts: '/api/us-jolts',
    manufacturing: '/api/us-manufacturing',
    macro: '/api/us-macro',
    rates: '/api/us-rates',
  },
}

async function fetchSource(origin, key, path, timeoutMs = 8500) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(`${origin}${path}`, {
      signal: controller.signal,
      next: { revalidate: 900 },
      headers: { 'User-Agent': 'JapanPulse workspace aggregator' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    if (payload?.error) throw new Error(payload.error)
    return {
      key,
      payload,
      status: 'current',
      durationMs: Date.now() - startedAt,
    }
  } catch (error) {
    return {
      key,
      payload: null,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: error.name === 'AbortError' ? 'Timed out' : error.message,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request) {
  const country = new URL(request.url).searchParams.get('country')?.toUpperCase()
  if (!SOURCES[country]) {
    return Response.json({ error: 'country must be JP or US' }, { status: 400 })
  }

  const origin = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : new URL(request.url).origin
  const entries = Object.entries(SOURCES[country])
  const results = await Promise.all(entries.map(([key, path]) => fetchSource(origin, key, path)))
  const sources = Object.fromEntries(results.map(result => [result.key, result.payload]))
  const status = Object.fromEntries(results.map(result => [result.key, {
    status: result.status,
    durationMs: result.durationMs,
    error: result.error || null,
  }]))
  const failed = results.filter(result => result.status === 'failed').length

  return Response.json({
    country,
    fetchedAt: new Date().toISOString(),
    delivery: 'aggregated',
    complete: failed === 0,
    summary: {
      total: results.length,
      current: results.length - failed,
      failed,
    },
    sources,
    status,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=21600',
    },
  })
}
