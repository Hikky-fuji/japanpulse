export const revalidate = 3600
export const dynamic = 'force-dynamic'

const SERIES = {
  openings: {
    id: 'JTSJOL',
    label: 'Job Openings',
    unit: 'thousands',
  },
  openingsRate: {
    id: 'JTSJOR',
    label: 'Job Openings Rate',
    unit: 'percent',
  },
  hiresRate: {
    id: 'JTSHIR',
    label: 'Hires Rate',
    unit: 'percent',
  },
  quitsRate: {
    id: 'JTSQUR',
    label: 'Quits Rate',
    unit: 'percent',
  },
  layoffsRate: {
    id: 'JTSLDR',
    label: 'Layoffs and Discharges Rate',
    unit: 'percent',
  },
  unemployed: {
    id: 'UNEMPLOY',
    label: 'Unemployment Level',
    unit: 'thousands',
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
    if (!response.ok) {
      throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
    }
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
  if (!response.ok) {
    throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
  }

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
      release: 'Job Openings and Labor Turnover Survey',
      frequency: 'Monthly',
      seasonalAdjustment: 'Seasonally Adjusted',
      revisionNote: 'The latest JOLTS observation is preliminary and normally revised with the next release.',
      fetchedAt: new Date().toISOString(),
      series: Object.fromEntries(entries),
    })
  } catch (error) {
    console.error('[US JOLTS]', error)
    return Response.json(
      { error: 'Unable to load US JOLTS data from FRED.' },
      { status: 502 },
    )
  }
}
