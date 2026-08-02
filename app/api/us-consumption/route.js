export const revalidate = 3600
export const dynamic = 'force-dynamic'

const SERIES = {
  headlinePce: {
    id: 'PCEPI',
    label: 'Headline PCE Price Index',
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
  realDisposableIncome: {
    id: 'DSPIC96',
    label: 'Real Disposable Personal Income',
    unit: 'billions of chained 2017 dollars, SAAR',
  },
  realGoods: {
    id: 'DGDSRX1',
    label: 'Real PCE: Goods',
    unit: 'billions of chained 2017 dollars, SAAR',
  },
  realServices: {
    id: 'PCESC96',
    label: 'Real PCE: Services',
    unit: 'billions of chained 2017 dollars, SAAR',
  },
  savingRate: {
    id: 'PSAVERT',
    label: 'Personal Saving Rate',
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
      source: 'U.S. Bureau of Economic Analysis via FRED',
      release: 'Personal Income and Outlays',
      frequency: 'Monthly',
      seasonalAdjustment: 'Seasonally Adjusted',
      fetchedAt: new Date().toISOString(),
      series: Object.fromEntries(entries),
    })
  } catch (error) {
    console.error('[US Personal Income and Outlays]', error)
    return Response.json(
      { error: 'Unable to load US personal income and outlays data from FRED.' },
      { status: 502 },
    )
  }
}
