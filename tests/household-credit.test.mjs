import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deriveHouseholdCreditTables,
  latestReportUrl,
  normalizeQuarter,
  quarterEndDate,
} from '../app/lib/household-credit.mjs'

test('NY Fed quarter labels normalize to quarter-end observation dates', () => {
  assert.equal(normalizeQuarter('26:Q2'), '2026-Q2')
  assert.equal(normalizeQuarter('2003:Q1'), '2003-Q1')
  assert.equal(quarterEndDate('2026-Q2'), '2026-06-30')
  assert.equal(normalizeQuarter('2026-06'), null)
})

test('latest workbook discovery accepts extensionless NY Fed links', () => {
  const html = '<a href="/medialibrary/interactives/householdcredit/data/xls/HHD_C_Report_2026Q2">Data</a>'
  assert.deepEqual(latestReportUrl(html), {
    url: 'https://www.newyorkfed.org/medialibrary/interactives/householdcredit/data/xls/HHD_C_Report_2026Q2.xlsx',
    release: '2026Q2',
  })
})

test('credit tables preserve published flows and derive only aggregate delinquency', () => {
  const sheetRows = {
    'Page 3 Data': [[null, 'Mortgage', 'HE Revolving', 'Auto Loan', 'Credit Card', 'Student Loan', 'Other', 'Total'], ['26:Q2', 13.1, .459, 1.71, 1.26, 1.65, .568, 18.77]],
    'Page 11 Data': [[null, 'Current', '30 days late', '60 days late', '90 days late', '120+ days late', 'Severely Derogatory', 'Total'], ['26:Q2', 95.3, 1, 1, 1, 1, .7, 100]],
    'Page 12 Data': [[null, 'MORTGAGE', 'HELOC', 'AUTO', 'CC', 'STUDENT LOAN', 'OTHER', 'ALL'], ['26:Q2', 1.2, 1.1, 3, 12.8, 10.6, 5, 4]],
    'Page 14 Data': [[null, 'AUTO', 'CC', 'MORTGAGE', 'HELOC', 'STUDENT LOAN', 'OTHER', 'ALL'], ['26:Q2', 3, 6.97, 1.52, 1.15, 7.83, 5.19, 2.57]],
    'Page 17 Data': [[null, 'foreclosure', 'bankruptcy'], ['26:Q2', 55, 137]],
  }
  const tables = deriveHouseholdCreditTables(sheetRows)

  assert.equal(tables.seriousTransitions[0].CC, 6.97)
  assert.equal(tables.aggregateDelinquency[0].value, 4.700000000000003)
  assert.equal(tables.balances[0].Total, 18.77)
})
