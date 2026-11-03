import { fetchFredSeries } from '../../lib/fred.js'
import { INCOME_COMPONENTS, PCE_NOMINAL, PCE_PRICE_ROWS } from '../../lib/us-pce-metrics.mjs'

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
  restaurantSales: {
    id: 'RSFSDP',
    label: 'Advance Retail Sales: Food Services and Drinking Places',
    unit: 'millions of dollars, seasonally adjusted',
    optional: true,
  },
  foodAwayCpi: {
    id: 'CUSR0000SEFV',
    label: 'CPI: Food Away from Home',
    unit: 'index, seasonally adjusted',
    optional: true,
  },
}

// Breakdown detail. Optional: a missing component blanks its row or chart but
// never fails the core PCE feed.
const DETAIL = {
  ...Object.fromEntries(PCE_PRICE_ROWS
    .filter(row => !SERIES[row.key])
    .map(row => [row.key, { id: row.id, label: `PCE price index: ${row.label}`, unit: 'index, 2017=100', optional: true }])),
  nominalPce: { id: PCE_NOMINAL.total, label: 'Personal consumption expenditures', unit: 'billions of dollars, SAAR', optional: true },
  nominalFood: { id: PCE_NOMINAL.food, label: 'PCE: Food', unit: 'billions of dollars, SAAR', optional: true },
  nominalEnergy: { id: PCE_NOMINAL.energy, label: 'PCE: Energy goods and services', unit: 'billions of dollars, SAAR', optional: true },
  nominalCore: { id: PCE_NOMINAL.core, label: 'PCE excluding food and energy', unit: 'billions of dollars, SAAR', optional: true },
  personalIncome: { id: 'PI', label: 'Personal income', unit: 'billions of dollars, SAAR', optional: true },
  disposableIncome: { id: 'DSPI', label: 'Disposable personal income', unit: 'billions of dollars, SAAR', optional: true },
  ...Object.fromEntries(INCOME_COMPONENTS
    .map(item => [item.key, { id: item.id, label: item.label, unit: 'billions of dollars, SAAR', optional: true }])),
}

async function mapLimited(items, limit, task) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function fetchSeries(apiKey, definition) {
  const observations = await fetchFredSeries(definition.id, {
    apiKey,
    limit: 400,
    startDate: '2015-01-01',
    revalidate,
    timeoutMs: 12000,
  })
  if (!observations.length) throw new Error(`${definition.id}: no observations returned`)
  return { ...definition, observations }
}

export async function GET() {
  try {
    const apiKey = process.env.FRED_API_KEY
    const definitions = Object.entries({ ...SERIES, ...DETAIL })
    const settled = await mapLimited(definitions, 10, ([, definition]) => fetchSeries(apiKey, definition))
    const entries = []
    const warnings = []

    settled.forEach((result, index) => {
      const [key, definition] = definitions[index]
      if (result.status === 'fulfilled') {
        entries.push([key, result.value])
      } else if (definition.optional) {
        warnings.push(`${definition.id}: ${result.reason?.message || 'optional feed unavailable'}`)
      } else {
        throw result.reason
      }
    })

    return Response.json({
      source: 'U.S. Bureau of Economic Analysis, Census Bureau and BLS via FRED',
      release: 'Personal Income and Outlays / Advance Retail Sales / Consumer Price Index',
      frequency: 'Monthly',
      seasonalAdjustment: 'Seasonally Adjusted',
      fetchedAt: new Date().toISOString(),
      series: Object.fromEntries(entries),
      meta: {
        partial: warnings.length > 0,
        warnings,
        diningMethod: 'Restaurant sales divided by the food-away-from-home CPI; growth rates are an approximate real-demand signal.',
        contributionMethod: 'Headline split: year-earlier nominal share times the component price change (approximate; the Fisher chain is not additive, so the gap is shown). Income split: exact BEA Table 2.6 identity, up to rounding.',
      },
    })
  } catch (error) {
    console.error('[US Personal Income and Outlays]', error)
    return Response.json(
      { error: 'Unable to load US personal income and outlays data from FRED.' },
      { status: 502 },
    )
  }
}
