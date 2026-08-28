import * as XLSX from 'xlsx'
import {
  deriveHouseholdCreditTables,
  latestReportUrl,
  seriesFromTable,
} from '../../lib/household-credit.mjs'

export const revalidate = 21600
export const dynamic = 'force-dynamic'

const LANDING_URL = 'https://www.newyorkfed.org/householdcredit/hhdc-iframe'
const FALLBACK_REPORT = {
  url: 'https://www.newyorkfed.org/medialibrary/interactives/householdcredit/data/xls/HHD_C_Report_2026Q2.xlsx',
  release: '2026Q2',
}

async function discoverReport() {
  try {
    const response = await fetch(LANDING_URL, {
      next: { revalidate },
      signal: AbortSignal.timeout(12000),
    })
    if (!response.ok) throw new Error(`NY Fed landing page returned HTTP ${response.status}`)
    return latestReportUrl(await response.text()) || FALLBACK_REPORT
  } catch {
    return FALLBACK_REPORT
  }
}

function workbookRows(workbook, names) {
  return Object.fromEntries(names.map(name => {
    const sheet = workbook.Sheets[name]
    if (!sheet) throw new Error(`NY Fed workbook is missing ${name}`)
    return [name, XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null })]
  }))
}

export async function GET() {
  try {
    const report = await discoverReport()
    const response = await fetch(report.url, {
      next: { revalidate },
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error(`NY Fed workbook returned HTTP ${response.status}`)

    const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' })
    const tables = deriveHouseholdCreditTables(workbookRows(workbook, [
      'Page 3 Data', 'Page 11 Data', 'Page 12 Data', 'Page 14 Data', 'Page 17 Data',
    ]))

    const series = {
      totalDebt: seriesFromTable(tables.balances, 'Total'),
      mortgageBalance: seriesFromTable(tables.balances, 'Mortgage'),
      helocBalance: seriesFromTable(tables.balances, 'HE Revolving'),
      autoBalance: seriesFromTable(tables.balances, 'Auto Loan'),
      creditCardBalance: seriesFromTable(tables.balances, 'Credit Card'),
      studentBalance: seriesFromTable(tables.balances, 'Student Loan'),
      aggregateDelinquency: tables.aggregateDelinquency,
      creditCard90Balance: seriesFromTable(tables.delinquent90, 'CC'),
      auto90Balance: seriesFromTable(tables.delinquent90, 'AUTO'),
      mortgage90Balance: seriesFromTable(tables.delinquent90, 'MORTGAGE'),
      student90Balance: seriesFromTable(tables.delinquent90, 'STUDENT LOAN'),
      creditCardSeriousFlow: seriesFromTable(tables.seriousTransitions, 'CC'),
      autoSeriousFlow: seriesFromTable(tables.seriousTransitions, 'AUTO'),
      mortgageSeriousFlow: seriesFromTable(tables.seriousTransitions, 'MORTGAGE'),
      studentSeriousFlow: seriesFromTable(tables.seriousTransitions, 'STUDENT LOAN'),
      foreclosure: seriesFromTable(tables.publicRecords, 'foreclosure'),
      bankruptcy: seriesFromTable(tables.publicRecords, 'bankruptcy'),
    }
    const latestQuarter = series.totalDebt.at(-1)?.period || null
    if (!latestQuarter || !Object.values(series).every(values => values.length)) {
      throw new Error('NY Fed workbook produced incomplete required series')
    }

    return Response.json({
      source: 'Federal Reserve Bank of New York Consumer Credit Panel / Equifax',
      release: `Quarterly Report on Household Debt and Credit ${report.release}`,
      frequency: 'Quarterly',
      seasonalAdjustment: 'Not seasonally adjusted',
      latestQuarter,
      fetchedAt: new Date().toISOString(),
      series,
      meta: {
        reportUrl: report.url,
        landingUrl: LANDING_URL,
        balanceUnit: 'trillions of dollars',
        rateUnit: 'percent of balance',
        seriousFlowDefinition: 'Four-quarter moving sum of balances newly transitioning into 90+ days delinquent.',
        aggregateDelinquencyMethod: '100 minus the published share of balances classified as current.',
        scoreBreak: 'Credit-score charts switch from Equifax Risk Score 3.0 to VantageScore 4.0 beginning in 2026Q1 and are intentionally excluded.',
      },
    })
  } catch (error) {
    console.error('[US Household Debt and Credit]', error)
    return Response.json(
      { error: 'Unable to load the NY Fed Household Debt and Credit workbook.' },
      { status: 502 },
    )
  }
}
