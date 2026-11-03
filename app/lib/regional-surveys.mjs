// Richmond and Dallas Fed manufacturing surveys, read from each Reserve
// Bank's own seasonally adjusted historical workbook. Column names are the
// publishers' headers; a renamed column drops that series to a warning.

export const RICHMOND_SURVEY = {
  key: 'richmond',
  label: 'Fifth District Survey of Manufacturing Activity',
  shortLabel: 'Richmond',
  source: 'Federal Reserve Bank of Richmond',
  url: 'https://www.richmondfed.org/-/media/RichmondFedOrg/region_communities/regional_data_analysis/regional_economy/surveys_of_business_conditions/manufacturing/data/mfg_historicaldata.xlsx',
  page: 'https://www.richmondfed.org/region_communities/regional_data_analysis/surveys/manufacturing',
  columns: {
    headline: { column: 'sa_mfg_composite', label: 'Composite Index' },
    newOrders: { column: 'sa_mfg_new_orders_c', label: 'New Orders' },
    shipments: { column: 'sa_mfg_ship_c', label: 'Shipments' },
    employment: { column: 'sa_mfg_emp_c', label: 'Number of Employees' },
    deliveryTime: { column: 'sa_mfg_vend_lead_c', label: 'Vendor Lead Time' },
    inventories: { column: 'sa_mfg_raw_mats_inv_c', label: 'Raw Materials Inventories' },
  },
}

export const DALLAS_SURVEY = {
  key: 'dallas',
  label: 'Texas Manufacturing Outlook Survey',
  shortLabel: 'Dallas',
  source: 'Federal Reserve Bank of Dallas',
  url: 'https://www.dallasfed.org/~/media/Documents/research/surveys/tmos/documents/index_sa.xls',
  page: 'https://www.dallasfed.org/research/surveys/tmos',
  columns: {
    headline: { column: 'prod', label: 'Production' },
    newOrders: { column: 'vnwo', label: 'Volume of New Orders' },
    production: { column: 'prod', label: 'Production' },
    employment: { column: 'nemp', label: 'Number of Employees' },
    deliveryTime: { column: 'dtm', label: 'Delivery Time' },
    inventories: { column: 'fgi', label: 'Finished Goods Inventories' },
    generalActivity: { column: 'bact', label: 'General Business Activity' },
    pricesPaid: { column: 'prm', label: 'Prices Paid for Raw Materials' },
    pricesReceived: { column: 'pfg', label: 'Prices Received for Finished Goods' },
    futureHeadline: { column: 'fbact', label: 'Future General Business Activity (6 months ahead)' },
  },
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
const iso = (year, month) => `${year}-${String(month).padStart(2, '0')}-01`

// Month of a workbook date cell: a Date, an Excel serial day, 'YYYY-MM-DD'
// or the Dallas 'Mon-YY' label. Anything else is not a data row.
export function cellMonth(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return iso(value.getUTCFullYear(), value.getUTCMonth() + 1)
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000)
    return iso(date.getUTCFullYear(), date.getUTCMonth() + 1)
  }
  if (typeof value !== 'string') return null
  const text = value.trim()
  const isoMatch = text.match(/^(\d{4})-(\d{2})/)
  if (isoMatch) return iso(Number(isoMatch[1]), Number(isoMatch[2]))
  const label = text.match(/^([A-Za-z]{3})[-\s](\d{2}|\d{4})$/)
  if (label && MONTHS[label[1].toLowerCase()]) {
    const year = label[2].length === 2 ? 2000 + Number(label[2]) : Number(label[2])
    return iso(year, MONTHS[label[1].toLowerCase()])
  }
  return null
}

const numeric = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value)
  return null
}

// rows: array of arrays with the header in the first row and dates in the
// first column. Returns { series, missing } where missing lists absent columns.
export function parseSurveyRows(rows = [], columns = {}) {
  const header = (rows[0] || []).map(cell => String(cell ?? '').trim().toLowerCase())
  const series = {}
  const missing = []
  for (const [key, definition] of Object.entries(columns)) {
    const index = header.indexOf(definition.column.toLowerCase())
    if (index < 0) {
      missing.push(definition.column)
      continue
    }
    const observations = []
    for (const row of rows.slice(1)) {
      const date = cellMonth(row?.[0])
      const value = numeric(row?.[index])
      if (date && value !== null) observations.push({ date, value })
    }
    observations.sort((a, b) => a.date.localeCompare(b.date))
    if (observations.length) series[key] = { label: definition.label, column: definition.column, observations }
    else missing.push(definition.column)
  }
  return { series, missing }
}

// Fourth Tuesday (Richmond) and last Monday (Dallas) of a month, as ISO dates.
export function nthWeekday(year, monthIndex, weekday, nth) {
  const first = new Date(Date.UTC(year, monthIndex, 1))
  const offset = (weekday - first.getUTCDay() + 7) % 7
  return new Date(Date.UTC(year, monthIndex, 1 + offset + (nth - 1) * 7))
}

export function lastWeekday(year, monthIndex, weekday) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0))
  const offset = (last.getUTCDay() - weekday + 7) % 7
  return new Date(Date.UTC(year, monthIndex + 1, -offset))
}

const RELEASE_RULES = {
  // Empire: the 15th, or the next business day.
  empire: (year, monthIndex) => {
    const date = new Date(Date.UTC(year, monthIndex, 15))
    while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1)
    return date
  },
  philly: (year, monthIndex) => nthWeekday(year, monthIndex, 4, 3),
  richmond: (year, monthIndex) => nthWeekday(year, monthIndex, 2, 4),
  dallas: (year, monthIndex) => lastWeekday(year, monthIndex, 1),
}

// Scheduled release date of a district survey for a reference month.
export function regionalReleaseDate(key, year, monthIndex) {
  return RELEASE_RULES[key]?.(year, monthIndex) ?? null
}

// Newest reference month that should be published by `today`, allowing a
// few days of grace for holidays and schedule shifts.
export function expectedLatestMonth(key, today = new Date(), graceDays = 3) {
  if (!RELEASE_RULES[key]) return null
  const limit = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  for (let back = 0; back < 3; back++) {
    const anchor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1))
    const release = regionalReleaseDate(key, anchor.getUTCFullYear(), anchor.getUTCMonth())
    if (release.getTime() + graceDays * 86400000 <= limit) return iso(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1)
  }
  return null
}

// Whole months by which a survey's latest observation trails its schedule.
export function surveyLag(key, latestDate, today = new Date(), graceDays = 3) {
  const expected = expectedLatestMonth(key, today, graceDays)
  if (!expected || !latestDate) return { key, latest: latestDate || null, expected, behind: expected ? null : 0 }
  const months = date => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7))
  return { key, latest: latestDate.slice(0, 10), expected, behind: Math.max(0, months(expected) - months(latestDate)) }
}
