export const revalidate = 3600
export const dynamic = 'force-dynamic'

const OBSERVATION_START = '2021-01-01'

const SERIES = {
  fedFunds: { id: 'DFF', label: 'Effective Federal Funds Rate', unit: 'percent', cadence: 'Daily' },
  treasury1m: { id: 'DGS1MO', label: '1-Month Treasury', unit: 'percent', cadence: 'Daily' },
  treasury3m: { id: 'DGS3MO', label: '3-Month Treasury', unit: 'percent', cadence: 'Daily' },
  treasury6m: { id: 'DGS6MO', label: '6-Month Treasury', unit: 'percent', cadence: 'Daily' },
  treasury1y: { id: 'DGS1', label: '1-Year Treasury', unit: 'percent', cadence: 'Daily' },
  treasury2y: { id: 'DGS2', label: '2-Year Treasury', unit: 'percent', cadence: 'Daily' },
  treasury5y: { id: 'DGS5', label: '5-Year Treasury', unit: 'percent', cadence: 'Daily' },
  treasury10y: { id: 'DGS10', label: '10-Year Treasury', unit: 'percent', cadence: 'Daily' },
  treasury30y: { id: 'DGS30', label: '30-Year Treasury', unit: 'percent', cadence: 'Daily' },
  real5y: { id: 'DFII5', label: '5-Year Real Treasury Yield', unit: 'percent', cadence: 'Daily' },
  real10y: { id: 'DFII10', label: '10-Year Real Treasury Yield', unit: 'percent', cadence: 'Daily' },
  breakeven5y: { id: 'T5YIE', label: '5-Year Breakeven Inflation', unit: 'percent', cadence: 'Daily' },
  breakeven10y: { id: 'T10YIE', label: '10-Year Breakeven Inflation', unit: 'percent', cadence: 'Daily' },
  spread2s10s: { id: 'T10Y2Y', label: '10-Year Minus 2-Year Treasury', unit: 'percent', cadence: 'Daily' },
  spread3m10y: { id: 'T10Y3M', label: '10-Year Minus 3-Month Treasury', unit: 'percent', cadence: 'Daily' },
  nfci: { id: 'NFCI', label: 'Chicago Fed National Financial Conditions Index', unit: 'index', cadence: 'Weekly' },
}

const CURVE = [
  ['1M', 'treasury1m'],
  ['3M', 'treasury3m'],
  ['6M', 'treasury6m'],
  ['1Y', 'treasury1y'],
  ['2Y', 'treasury2y'],
  ['5Y', 'treasury5y'],
  ['10Y', 'treasury10y'],
  ['30Y', 'treasury30y'],
]

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

function cleanObservations(series) {
  return (series?.observations || []).filter(point => Number.isFinite(point.value))
}

function latest(series) {
  return cleanObservations(series).at(-1) || null
}

function pointOnOrBefore(series, date) {
  const observations = cleanObservations(series)
  for (let index = observations.length - 1; index >= 0; index -= 1) {
    if (observations[index].date <= date) return observations[index]
  }
  return null
}

function shiftMonths(date, months) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() + months)
  return value.toISOString().slice(0, 10)
}

function curveAt(series, date) {
  return CURVE.map(([maturity, key]) => ({
    maturity,
    value: pointOnOrBefore(series[key], date)?.value ?? null,
  }))
}

function change(series, date, days) {
  const current = pointOnOrBefore(series, date)
  const target = new Date(`${date}T12:00:00Z`)
  target.setUTCDate(target.getUTCDate() - days)
  const prior = pointOnOrBefore(series, target.toISOString().slice(0, 10))
  return current && prior ? (current.value - prior.value) * 100 : null
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
    const series = Object.fromEntries(entries)
    const curveDates = CURVE
      .map(([, key]) => latest(series[key])?.date)
      .filter(Boolean)
      .sort()
    const curveDate = curveDates[0] || null
    const previousCurveDate = curveDate ? shiftMonths(curveDate, -3) : null
    const tenYear = latest(series.treasury10y)
    const twoYear = latest(series.treasury2y)
    const fedFunds = latest(series.fedFunds)
    const real10y = latest(series.real10y)
    const breakeven5y = latest(series.breakeven5y)
    const breakeven10y = latest(series.breakeven10y)
    const spread2s10s = latest(series.spread2s10s)
    const spread3m10y = latest(series.spread3m10y)
    const nfci = latest(series.nfci)
    const nfciPrior = nfci ? pointOnOrBefore(series.nfci, shiftMonths(nfci.date, -1)) : null

    return Response.json({
      source: 'Federal Reserve Board, Chicago Fed and U.S. Treasury data via FRED',
      fetchedAt: new Date().toISOString(),
      automatic: true,
      series,
      curve: {
        date: curveDate,
        current: curveDate ? curveAt(series, curveDate) : [],
        priorDate: previousCurveDate,
        prior: previousCurveDate ? curveAt(series, previousCurveDate) : [],
      },
      latest: {
        date: curveDate,
        fedFunds,
        twoYear,
        tenYear,
        real10y,
        breakeven5y,
        breakeven10y,
        spread2s10s,
        spread3m10y,
        nfci,
        nfciFourWeekChange: nfci && nfciPrior ? nfci.value - nfciPrior.value : null,
        changes: {
          twoYear: curveDate ? { oneDayBp: change(series.treasury2y, curveDate, 1), oneWeekBp: change(series.treasury2y, curveDate, 7), oneMonthBp: change(series.treasury2y, curveDate, 30) } : null,
          tenYear: curveDate ? { oneDayBp: change(series.treasury10y, curveDate, 1), oneWeekBp: change(series.treasury10y, curveDate, 7), oneMonthBp: change(series.treasury10y, curveDate, 30) } : null,
        },
        policyGapToTwoYear: fedFunds && twoYear ? (twoYear.value - fedFunds.value) * 100 : null,
      },
      methodology: {
        curve: 'The latest curve uses the most recent date available across every displayed Treasury maturity; the comparison curve uses the closest observation on or before three months earlier.',
        breakeven: 'Treasury breakevens are market-implied inflation compensation, not pure inflation forecasts; risk and liquidity premia also matter.',
        nfci: 'Positive NFCI values indicate tighter-than-average financial conditions; negative values indicate looser-than-average conditions.',
      },
    })
  } catch (error) {
    console.error('[US Rates & Financial Conditions]', error)
    return Response.json(
      { error: 'Unable to load US rates and financial-conditions data from FRED.' },
      { status: 502 },
    )
  }
}
