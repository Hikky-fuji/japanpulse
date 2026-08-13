export const revalidate = 3600
export const dynamic = 'force-dynamic'

const OBSERVATION_START = '1978-01-01'

const SERIES = {
  sentiment: {
    id: 'UMCSENT',
    label: 'University of Michigan: Consumer Sentiment',
    unit: 'index, 1966 Q1 = 100',
  },
  oneYearInflation: {
    id: 'MICH',
    label: 'University of Michigan: Inflation Expectation',
    unit: 'percent',
  },
  headlineCpi: {
    id: 'CPIAUCSL',
    label: 'Consumer Price Index: All Items',
    unit: 'index',
  },
  corePce: {
    id: 'PCEPILFE',
    label: 'Core PCE Price Index',
    unit: 'index',
  },
  realPce: {
    id: 'PCEC96',
    label: 'Real Personal Consumption Expenditures',
    unit: 'billions of chained 2017 dollars, SAAR',
  },
  unemployment: {
    id: 'UNRATE',
    label: 'Civilian Unemployment Rate',
    unit: 'percent',
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
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${definition.id}&cosd=${OBSERVATION_START}`,
      { next: { revalidate } },
    )
    if (!response.ok) throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
    return { ...definition, observations: parseCsv(await response.text()) }
  }

  const params = new URLSearchParams({
    series_id: definition.id,
    api_key: apiKey,
    file_type: 'json',
    observation_start: OBSERVATION_START,
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
      source: 'University of Michigan, BLS and BEA via FRED',
      release: 'Surveys of Consumers',
      frequency: 'Monthly',
      seasonalAdjustment: 'Michigan series are not seasonally adjusted',
      fetchedAt: new Date().toISOString(),
      automatic: true,
      availability: {
        lag: 'The Michigan series available through FRED are delayed by one month at the source’s request.',
        scope: 'This public dashboard uses only UMCSENT and MICH; licensed detail and Conference Board series are excluded.',
      },
      series: Object.fromEntries(entries),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600',
      },
    })
  } catch (error) {
    console.error('[US Consumer Sentiment]', error)
    return Response.json(
      { error: 'Unable to load US consumer sentiment data from FRED.' },
      { status: 502 },
    )
  }
}
