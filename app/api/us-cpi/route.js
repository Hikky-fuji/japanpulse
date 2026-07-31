export const dynamic = 'force-dynamic'

const SERIES = {
  headline: { id: 'CPIAUCSL', label: 'Headline CPI' },
  core: { id: 'CPILFESL', label: 'Core CPI' },
  servicesExShelter: { id: 'CUSR0000SASL2RS', label: 'Services ex Shelter' },
  food: { id: 'CPIUFDSL', label: 'Food' },
  energy: { id: 'CPIENGSL', label: 'Energy' },
  coreGoods: { id: 'CUSR0000SACL1E', label: 'Core Goods' },
  coreServices: { id: 'CUSR0000SASLE', label: 'Core Services' },
  vehicles: { id: 'CUSR0000SETA', label: 'New & Used Vehicles' },
  usedCars: { id: 'CUSR0000SETA02', label: 'Used Cars & Trucks' },
  furnishings: { id: 'CUSR0000SAH3', label: 'Household Furnishings' },
  apparel: { id: 'CPIAPPSL', label: 'Apparel' },
  rent: { id: 'CUSR0000SEHA', label: 'Rent of Primary Residence' },
  oer: { id: 'CUSR0000SEHC', label: "Owners' Equivalent Rent" },
  medical: { id: 'CPIMEDSL', label: 'Medical Care' },
  education: { id: 'CPIEDUSL', label: 'Education & Communication' },
  transportation: { id: 'CUSR0000SAS4', label: 'Transportation Services' },
}

function preserveOfficialGap(observations) {
  const gapDate = '2025-10-01'
  const withoutGap = observations.filter(observation => observation.date !== gapDate)
  return [...withoutGap, { date: gapDate, value: null }]
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function fetchSeries(apiKey, definition) {
  if (!apiKey) {
    const response = await fetch(
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${definition.id}&cosd=2019-01-01`,
      { next: { revalidate: 3600 } },
    )
    if (!response.ok) {
      throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
    }
    const rows = (await response.text()).trim().split(/\r?\n/).slice(1)
    return {
      ...definition,
      observations: preserveOfficialGap(rows.map(row => {
        const [date, rawValue] = row.split(',')
        const value = Number(rawValue)
        return { date, value: rawValue === '.' || !Number.isFinite(value) ? null : value }
      })),
    }
  }

  const params = new URLSearchParams({
    series_id: definition.id,
    api_key: apiKey,
    file_type: 'json',
    observation_start: '2019-01-01',
    sort_order: 'asc',
  })

  const response = await fetch(
    `https://api.stlouisfed.org/fred/series/observations?${params}`,
    { next: { revalidate: 3600 } },
  )

  if (!response.ok) {
    throw new Error(`FRED returned HTTP ${response.status} for ${definition.id}`)
  }

  const payload = await response.json()
  if (payload.error_message) {
    throw new Error(`${definition.id}: ${payload.error_message}`)
  }

  return {
    ...definition,
    observations: preserveOfficialGap((payload.observations || []).map(observation => ({
      date: observation.date,
      value: observation.value === '.' ? null : Number(observation.value),
    }))),
  }
}

export async function GET() {
  const apiKey = process.env.FRED_API_KEY

  try {
    const entries = await Promise.all(
      Object.entries(SERIES).map(async ([key, definition]) => [
        key,
        await fetchSeries(apiKey, definition),
      ]),
    )

    return Response.json({
      source: 'Federal Reserve Bank of St. Louis (FRED); underlying CPI data from BLS',
      frequency: 'Monthly',
      seasonalAdjustment: 'Seasonally Adjusted',
      fetchedAt: new Date().toISOString(),
      missingPeriods: [{
        date: '2025-10-01',
        label: 'Data unavailable due to the 2025 lapse in appropriations',
        sourceUrl: 'https://www.bls.gov/cpi/additional-resources/2025-federal-government-shutdown-impact-cpi-faq.htm',
      }],
      // December 2025 CPI-U relative importance. Used only for an approximate
      // decomposition; the displayed headline remains the official FRED series.
      contributionWeights: {
        food: 0.13698,
        energy: 0.06383,
        coreGoods: 0.19176,
        coreServices: 0.60744,
      },
      series: Object.fromEntries(entries),
    })
  } catch (error) {
    console.error('[US CPI]', error)
    return Response.json(
      { error: 'Unable to load CPI data from FRED.' },
      { status: 502 },
    )
  }
}
