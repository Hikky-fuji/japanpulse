export const revalidate = 21600
export const dynamic = 'force-dynamic'

const BOJ_BASE = 'https://www.stat-search.boj.or.jp/api/v1/getDataCode'
const START_DATE = '202201'

const SERIES = {
  callRate: { db: 'FM01', code: 'STRDCLUCON' },
  usdJpy: { db: 'FM08', code: 'FXERD04' },
  neer: { db: 'FM09', code: 'FX180110001' },
  reer: { db: 'FM09', code: 'FX180110002' },
}

function parseDate(value) {
  const text = String(value ?? '').replace(/\D/g, '')
  if (text.length >= 8) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`
  if (text.length >= 6) return `${text.slice(0, 4)}-${text.slice(4, 6)}-01`
  return null
}

function parseSeries(series) {
  if (!series) return []
  const valueBlock = series.VALUES ?? {}
  const dates = valueBlock.SURVEY_DATES ?? series.SURVEY_DATES ?? []
  const values = valueBlock.VALUES ?? series.VALUES ?? []

  return dates
    .map((date, index) => {
      const period = parseDate(date)
      const value = Number(values[index])
      return period && Number.isFinite(value) ? { date: period, value } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function fetchDatabase(db, definitions) {
  const params = new URLSearchParams({
    format: 'json',
    lang: 'en',
    db,
    code: definitions.map(item => item.code).join(','),
    startDate: START_DATE,
  })
  const response = await fetch(`${BOJ_BASE}?${params}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(20000),
  })
  const payload = await response.json()
  if (!response.ok || Number(payload.STATUS) !== 200) {
    throw new Error(payload.MESSAGE || `BOJ API returned HTTP ${response.status}`)
  }
  return payload.RESULTSET ?? payload?.DATA?.SERIES ?? []
}

function pointChange(series, distance, scale = 1) {
  if (!Array.isArray(series) || series.length <= distance) return null
  const current = series.at(-1)?.value
  const prior = series.at(-(distance + 1))?.value
  return Number.isFinite(current) && Number.isFinite(prior)
    ? (current - prior) * scale
    : null
}

function percentChange(series, distance) {
  if (!Array.isArray(series) || series.length <= distance) return null
  const current = series.at(-1)?.value
  const prior = series.at(-(distance + 1))?.value
  return Number.isFinite(current) && Number.isFinite(prior) && prior !== 0
    ? (current / prior - 1) * 100
    : null
}

export async function GET() {
  try {
    const grouped = Object.entries(SERIES).reduce((map, [key, definition]) => {
      if (!map[definition.db]) map[definition.db] = []
      map[definition.db].push({ key, ...definition })
      return map
    }, {})

    const databases = await Promise.all(Object.entries(grouped).map(async ([db, definitions]) => [
      db,
      await fetchDatabase(db, definitions),
    ]))
    const resultsets = Object.fromEntries(databases)
    const series = {}

    for (const [key, definition] of Object.entries(SERIES)) {
      const match = resultsets[definition.db]?.find(item => item.SERIES_CODE === definition.code)
      series[key] = parseSeries(match)
    }

    if (!series.usdJpy.length || !series.reer.length) {
      throw new Error('BOJ did not return the required yen observations')
    }

    return Response.json({
      series,
      latest: {
        callRate: series.callRate.at(-1) ?? null,
        usdJpy: series.usdJpy.at(-1) ?? null,
        neer: series.neer.at(-1) ?? null,
        reer: series.reer.at(-1) ?? null,
        changes: {
          callRateOneMonthBp: pointChange(series.callRate, 21, 100),
          usdJpyOneMonthPct: percentChange(series.usdJpy, 21),
          usdJpyThreeMonthPct: percentChange(series.usdJpy, 63),
          neerOneYearPct: percentChange(series.neer, 12),
          reerOneYearPct: percentChange(series.reer, 12),
        },
      },
      meta: {
        source: 'Bank of Japan Time-Series Data Search API',
        seriesCodes: Object.fromEntries(Object.entries(SERIES).map(([key, value]) => [key, `${value.db}'${value.code}`])),
        direction: {
          usdJpy: 'A higher value means more yen per U.S. dollar (yen depreciation).',
          effectiveRates: 'A higher NEER or REER index indicates yen appreciation on a trade-weighted basis.',
        },
      },
    })
  } catch (error) {
    console.error('[Yen transmission]', error)
    return Response.json({ error: error.message }, { status: 502 })
  }
}
