export const revalidate = 3600
export const dynamic = 'force-dynamic'

const SERIES = {
  headline: {
    id: 'PPIFIS',
    label: 'PPI Final Demand',
    unit: 'index',
  },
  core: {
    id: 'PPIFES',
    label: 'PPI Final Demand Less Foods and Energy',
    unit: 'index',
  },
  coreExTrade: {
    id: 'WPSFD49116',
    label: 'PPI Final Demand Less Foods, Energy, and Trade Services',
    unit: 'index',
  },
  goods: {
    id: 'PPIDGS',
    label: 'PPI Final Demand Goods',
    unit: 'index',
  },
  services: {
    id: 'PPIDSS',
    label: 'PPI Final Demand Services',
    unit: 'index',
  },
  energy: {
    id: 'PPIDES',
    label: 'PPI Final Demand Energy',
    unit: 'index',
  },
  tradeServices: {
    id: 'PPITSS',
    label: 'PPI Final Demand Trade Services',
    unit: 'index',
  },
}

function parseCsv(text) {
  return text
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map(row => {
      const [date, rawValue] = row.split(',')
      const value = Number(rawValue)
      return {
        date,
        value: rawValue === '.' || !Number.isFinite(value) ? null : value,
      }
    })
}

async function fetchSeries(apiKey, definition) {
  if (!apiKey) {
    const response = await fetch(
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${definition.id}&cosd=2015-01-01`,
      { next: { revalidate } },
    )
    if (!response.ok) throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
    return { ...definition, observations: parseCsv(await response.text()) }
  }

  const params = new URLSearchParams({
    series_id: definition.id,
    api_key: apiKey,
    file_type: 'json',
    observation_start: '2015-01-01',
    sort_order: 'asc',
  })
  const response = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?${params}`,
    { next: { revalidate } },
  )
  if (!response.ok) throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
  const payload = await response.json()
  if (payload.error_message) throw new Error(`${definition.id}: ${payload.error_message}`)

  return {
    ...definition,
    observations: (payload.observations || []).map(observation => ({
      date: observation.date,
      value: observation.value === '.' ? null : Number(observation.value),
    })),
  }
}

export async function GET() {
  try {
    const apiKey = process.env.FRED_API_KEY
    const entries = await Promise.all(
      Object.entries(SERIES).map(async ([key, definition]) => [
        key,
        await fetchSeries(apiKey, definition),
      ]),
    )

    return Response.json({
      source: 'U.S. Bureau of Labor Statistics via FRED',
      release: 'Producer Price Index',
      releaseId: 46,
      frequency: 'Monthly',
      seasonalAdjustment: 'Seasonally Adjusted',
      fetchedAt: new Date().toISOString(),
      series: Object.fromEntries(entries),
    })
  } catch (error) {
    console.error('[US Producer Price Index]', error)
    return Response.json(
      { error: 'Unable to load US producer price data from FRED.' },
      { status: 502 },
    )
  }
}
