import { fetchFredSeries } from '../../lib/fred.js'
import { fetchWithRetry } from '../../lib/resilient-fetch.js'
import { DALLAS_SURVEY, RICHMOND_SURVEY, parseSurveyRows } from '../../lib/regional-surveys.mjs'

export const revalidate = 3600
export const dynamic = 'force-dynamic'

const HISTORY_START = '2017-01-01'

const REGIONAL_SERIES = {
  empire: {
    label: 'Empire State Manufacturing Survey',
    shortLabel: 'New York',
    source: 'Federal Reserve Bank of New York via FRED',
    series: {
      headline: { id: 'GACDISA066MSFRBNY', label: 'General Business Conditions' },
      newOrders: { id: 'NOCDISA066MSFRBNY', label: 'New Orders' },
      shipments: { id: 'SHCDISA066MSFRBNY', label: 'Shipments' },
      employment: { id: 'NECDISA066MSFRBNY', label: 'Number of Employees' },
      deliveryTime: { id: 'DTCDISA066MSFRBNY', label: 'Delivery Time' },
      inventories: { id: 'IVCDISA066MSFRBNY', label: 'Inventories' },
      pricesPaid: { id: 'PPCDISA066MSFRBNY', label: 'Prices Paid' },
      pricesReceived: { id: 'PRCDISA066MSFRBNY', label: 'Prices Received' },
      futureHeadline: { id: 'GAFDISA066MSFRBNY', label: 'Future General Business Conditions (6 months ahead)' },
    },
  },
  philly: {
    label: 'Manufacturing Business Outlook Survey',
    shortLabel: 'Philadelphia',
    source: 'Federal Reserve Bank of Philadelphia via FRED',
    series: {
      headline: { id: 'GACDFSA066MSFRBPHI', label: 'General Activity' },
      newOrders: { id: 'NOCDFSA066MSFRBPHI', label: 'New Orders' },
      shipments: { id: 'SHCDFSA066MSFRBPHI', label: 'Shipments' },
      employment: { id: 'NECDFSA066MSFRBPHI', label: 'Number of Employees' },
      deliveryTime: { id: 'DTCDFSA066MSFRBPHI', label: 'Delivery Time' },
      inventories: { id: 'IVCDFSA066MSFRBPHI', label: 'Inventories' },
      pricesPaid: { id: 'PPCDFSA066MSFRBPHI', label: 'Prices Paid' },
      pricesReceived: { id: 'PRCDFSA066MSFRBPHI', label: 'Prices Received' },
      futureHeadline: { id: 'GAFDFSA066MSFRBPHI', label: 'Future General Activity (6 months ahead)' },
    },
  },
}

// ISM does not provide a public API and its website terms restrict automated
// collection. Keep this compact official snapshot explicit and auditable.
const ISM_SNAPSHOT = {
  label: 'ISM Manufacturing PMI',
  source: 'Institute for Supply Management',
  sourceUrl: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/october/',
  updateMode: 'Official snapshot — manually verified',
  verifiedAt: '2026-11-02',
  headline: [
    { date: '2025-11-01', value: 48.0 },
    { date: '2025-12-01', value: 47.9 },
    { date: '2026-01-01', value: 52.6 },
    { date: '2026-02-01', value: 52.4 },
    { date: '2026-03-01', value: 52.7 },
    { date: '2026-04-01', value: 52.7 },
    { date: '2026-05-01', value: 54.0 },
    { date: '2026-06-01', value: 53.3 },
    { date: '2026-07-01', value: 55.6 },
    { date: '2026-08-01', value: 54.6 },
    { date: '2026-09-01', value: 54.5 },
    { date: '2026-10-01', value: 55.5 },
  ],
  latest: {
    headline: 55.5,
    newOrders: 55.5,
    production: 59.0,
    employment: 52.4,
    pricesPaid: 75.2,
    inventories: 51.4,
    supplierDeliveries: 59.1,
  },
}

async function fetchSeries(apiKey, definition) {
  const observations = await fetchFredSeries(definition.id, {
    apiKey,
    limit: 400,
    startDate: HISTORY_START,
    revalidate,
  })
  if (!observations.length) throw new Error(`${definition.id}: no observations returned`)
  return { ...definition, observations }
}

// Each survey needs its headline; component series degrade to meta.warnings.
async function fetchSurvey(apiKey, definition, warnings) {
  const definitions = Object.entries(definition.series)
  const settled = await Promise.allSettled(definitions.map(([, series]) => fetchSeries(apiKey, series)))
  const series = {}
  settled.forEach((result, index) => {
    const [key, seriesDefinition] = definitions[index]
    if (result.status === 'fulfilled') series[key] = result.value
    else if (key === 'headline') throw result.reason
    else warnings.push(`${seriesDefinition.id}: ${result.reason?.message || 'unavailable'}`)
  })

  return {
    label: definition.label,
    shortLabel: definition.shortLabel,
    source: definition.source,
    series,
  }
}

// Richmond and Dallas publish full seasonally adjusted histories as
// workbooks. They complete the four-district ISM-equivalent composite but are
// optional: a failure is a warning, never a failed feed.
async function fetchWorkbookSurvey(definition, warnings) {
  try {
    const response = await fetchWithRetry(definition.url, { next: { revalidate } }, { attempts: 2, timeoutMs: 15000 })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: 'array', cellDates: true })
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: true, defval: null })
    const { series, missing } = parseSurveyRows(rows, definition.columns)
    // Match the FRED-delivered surveys' window so the payload stays compact.
    for (const entry of Object.values(series)) {
      entry.observations = entry.observations.filter(point => point.date >= HISTORY_START)
    }
    if (missing.length) warnings.push(`${definition.shortLabel}: missing ${missing.join(', ')}`)
    if (!series.headline) throw new Error('headline column not found')
    return {
      label: definition.label,
      shortLabel: definition.shortLabel,
      source: `${definition.source} (official workbook)`,
      sourceUrl: definition.page,
      series,
    }
  } catch (error) {
    warnings.push(`${definition.shortLabel} survey unavailable: ${error.message}`)
    return null
  }
}

export async function GET() {
  try {
    const apiKey = process.env.FRED_API_KEY
    const warnings = []
    const [empire, philly, richmond, dallas] = await Promise.all([
      fetchSurvey(apiKey, REGIONAL_SERIES.empire, warnings),
      fetchSurvey(apiKey, REGIONAL_SERIES.philly, warnings),
      fetchWorkbookSurvey(RICHMOND_SURVEY, warnings),
      fetchWorkbookSurvey(DALLAS_SURVEY, warnings),
    ])

    return Response.json({
      fetchedAt: new Date().toISOString(),
      frequency: 'Monthly',
      regional: { empire, philly, ...(richmond && { richmond }), ...(dallas && { dallas }) },
      ism: ISM_SNAPSHOT,
      meta: { partial: warnings.length > 0, warnings },
      cadence: [
        {
          key: 'empire',
          sequence: 1,
          timing: 'Around the 15th',
          time: '08:30 ET',
          role: 'Early regional read',
          importance: 'Lead',
        },
        {
          key: 'philly',
          sequence: 2,
          timing: 'Third Thursday',
          time: '08:30 ET',
          role: 'Regional confirmation',
          importance: 'Confirm',
        },
        {
          key: 'richmond',
          sequence: 3,
          timing: 'Usually fourth Tuesday',
          time: '10:00 ET',
          role: 'Southeast breadth',
          importance: 'Breadth',
        },
        {
          key: 'dallas',
          sequence: 4,
          timing: 'Last Monday',
          time: '10:30 ET',
          role: 'Texas breadth',
          importance: 'Breadth',
        },
        {
          key: 'ism',
          sequence: 5,
          timing: 'First business day, next month',
          time: '10:00 ET',
          role: 'National manufacturing anchor',
          importance: 'Anchor',
        },
      ],
    })
  } catch (error) {
    console.error('[US Manufacturing Momentum]', error)
    return Response.json(
      { error: 'Unable to load US manufacturing survey data.' },
      { status: 502 },
    )
  }
}
