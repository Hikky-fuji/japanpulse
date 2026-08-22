export const revalidate = 3600
export const dynamic = 'force-dynamic'

const SERIES = {
  starts: { id: 'HOUST', label: 'Housing Starts', unit: 'thousands, SAAR' },
  permits: { id: 'PERMIT', label: 'Building Permits', unit: 'thousands, SAAR' },
  completions: { id: 'COMPUTSA', label: 'Housing Completions', unit: 'thousands, SAAR', optional: true },
  singleFamily: { id: 'HOUST1F', label: 'Single-Family Starts', unit: 'thousands, SAAR', optional: true },
  multifamily: { id: 'HOUST5F', label: '5+ Unit Starts', unit: 'thousands, SAAR', optional: true },
  newHomeSales: { id: 'HSN1F', label: 'New One-Family Home Sales', unit: 'thousands, SAAR' },
  monthsSupply: { id: 'MSACSR', label: 'New Home Months of Supply', unit: 'months', optional: true },
  mortgage: { id: 'MORTGAGE30US', label: '30-Year Fixed Mortgage Rate', unit: 'percent, weekly', optional: true },
  housePrices: { id: 'USSTHPI', label: 'FHFA All-Transactions House Price Index', unit: 'index, quarterly', optional: true },
}

function parseCsv(text) {
  return text.trim().split(/\r?\n/).slice(1).map(row => {
    const [date, rawValue] = row.split(',')
    const value = Number(rawValue)
    return { date, value: rawValue === '.' || !Number.isFinite(value) ? null : value }
  })
}

async function fetchSeries(apiKey, definition) {
  if (!apiKey) {
    const response = await fetch(
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${definition.id}&cosd=2010-01-01`,
      { next: { revalidate }, signal: AbortSignal.timeout(12000) },
    )
    if (!response.ok) throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
    return { ...definition, observations: parseCsv(await response.text()) }
  }
  const params = new URLSearchParams({
    series_id: definition.id,
    api_key: apiKey,
    file_type: 'json',
    observation_start: '2010-01-01',
    sort_order: 'asc',
  })
  const response = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?${params}`,
    { next: { revalidate }, signal: AbortSignal.timeout(12000) },
  )
  if (!response.ok) throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
  const payload = await response.json()
  if (payload.error_message) throw new Error(`${definition.id}: ${payload.error_message}`)
  return {
    ...definition,
    observations: (payload.observations || []).map(item => ({
      date: item.date,
      value: item.value === '.' ? null : Number(item.value),
    })),
  }
}

export async function GET() {
  try {
    const definitions = Object.entries(SERIES)
    const settled = await Promise.allSettled(
      definitions.map(([, definition]) => fetchSeries(process.env.FRED_API_KEY, definition)),
    )
    const entries = []
    const warnings = []
    settled.forEach((result, index) => {
      const [key, definition] = definitions[index]
      if (result.status === 'fulfilled') entries.push([key, result.value])
      else if (definition.optional) warnings.push(`${definition.id}: ${result.reason?.message || 'unavailable'}`)
      else throw result.reason
    })
    return Response.json({
      source: 'U.S. Census Bureau, HUD, Freddie Mac and FHFA via FRED',
      release: 'New Residential Construction / New Residential Sales / Primary Mortgage Market Survey / FHFA HPI',
      frequency: 'Monthly, weekly and quarterly',
      fetchedAt: new Date().toISOString(),
      series: Object.fromEntries(entries),
      meta: { partial: warnings.length > 0, warnings },
    })
  } catch (error) {
    console.error('[US Housing]', error)
    return Response.json({ error: 'Unable to load US housing data from FRED.' }, { status: 502 })
  }
}
