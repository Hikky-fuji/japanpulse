const QUARTER_PATTERN = /^(\d{2}|\d{4}):Q([1-4])$/

export function normalizeQuarter(value) {
  const match = String(value || '').trim().match(QUARTER_PATTERN)
  if (!match) return null
  const year = match[1].length === 2 ? 2000 + Number(match[1]) : Number(match[1])
  return `${year}-Q${match[2]}`
}

export function quarterEndDate(period) {
  const match = String(period || '').match(/^(\d{4})-Q([1-4])$/)
  if (!match) return null
  const month = Number(match[2]) * 3
  return new Date(Date.UTC(Number(match[1]), month, 0)).toISOString().slice(0, 10)
}

function finite(value) {
  return Number.isFinite(value) ? value : null
}

export function parseSheetTable(rows, headerLabels) {
  const headerIndex = rows.findIndex(row => headerLabels.every(label => row.includes(label)))
  if (headerIndex < 0) throw new Error(`Workbook headers not found: ${headerLabels.join(', ')}`)

  const header = rows[headerIndex]
  const columns = Object.fromEntries(headerLabels.map(label => [label, header.indexOf(label)]))
  return rows.slice(headerIndex + 1).flatMap(row => {
    const period = normalizeQuarter(row[0])
    if (!period) return []
    return [{
      period,
      date: quarterEndDate(period),
      ...Object.fromEntries(headerLabels.map(label => [label, finite(row[columns[label]])])),
    }]
  })
}

export function seriesFromTable(table, sourceColumn) {
  return table
    .filter(row => Number.isFinite(row[sourceColumn]))
    .map(row => ({ period: row.period, date: row.date, value: row[sourceColumn] }))
}

export function deriveHouseholdCreditTables(sheetRows) {
  const balances = parseSheetTable(sheetRows['Page 3 Data'], [
    'Mortgage', 'HE Revolving', 'Auto Loan', 'Credit Card', 'Student Loan', 'Other', 'Total',
  ])
  const delinquencyStatus = parseSheetTable(sheetRows['Page 11 Data'], [
    'Current', '30 days late', '60 days late', '90 days late', '120+ days late', 'Severely Derogatory', 'Total',
  ])
  const delinquent90 = parseSheetTable(sheetRows['Page 12 Data'], [
    'MORTGAGE', 'HELOC', 'AUTO', 'CC', 'STUDENT LOAN', 'OTHER', 'ALL',
  ])
  const seriousTransitions = parseSheetTable(sheetRows['Page 14 Data'], [
    'AUTO', 'CC', 'MORTGAGE', 'HELOC', 'STUDENT LOAN', 'OTHER', 'ALL',
  ])
  const publicRecords = parseSheetTable(sheetRows['Page 17 Data'], ['foreclosure', 'bankruptcy'])

  const aggregateDelinquency = delinquencyStatus.map(row => ({
    period: row.period,
    date: row.date,
    value: Number.isFinite(row.Current) ? 100 - row.Current : null,
  })).filter(row => Number.isFinite(row.value))

  return { balances, delinquent90, seriousTransitions, publicRecords, aggregateDelinquency }
}

export function latestReportUrl(html, origin = 'https://www.newyorkfed.org') {
  const match = String(html).match(/(?:https?:\/\/www\.newyorkfed\.org)?(\/medialibrary\/interactives\/householdcredit\/data\/xls\/HHD_C_Report_(\d{4}Q[1-4])(?:\.xlsx)?)/i)
  if (!match) return null
  const path = match[1].endsWith('.xlsx') ? match[1] : `${match[1]}.xlsx`
  return { url: new URL(path, origin).toString(), release: match[2] }
}
