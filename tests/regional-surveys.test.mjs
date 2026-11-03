import assert from 'node:assert/strict'
import test from 'node:test'

import { districtComposite, ismEquivalentComposite } from '../app/lib/regional-ism.mjs'
import {
  DALLAS_SURVEY,
  RICHMOND_SURVEY,
  cellMonth,
  lastWeekday,
  nthWeekday,
  parseSurveyRows,
} from '../app/lib/regional-surveys.mjs'

const close = (actual, expected, digits = 6) => assert.ok(Math.abs(actual - expected) < 10 ** -digits, `${actual} != ${expected}`)
const obs = pairs => ({ observations: pairs.map(([date, value]) => ({ date, value })) })

test('workbook date cells resolve to the first of the month', () => {
  assert.equal(cellMonth(new Date(Date.UTC(2026, 9, 1))), '2026-10-01')
  assert.equal(cellMonth('Oct-26'), '2026-10-01')
  assert.equal(cellMonth('Jun-04'), '2004-06-01')
  assert.equal(cellMonth('2026-09-01 00:00:00'), '2026-09-01')
  assert.equal(cellMonth(46296), '2026-10-01')
  assert.equal(cellMonth('date'), null)
  assert.equal(cellMonth(12), null)
})

test('survey rows keep numeric cells, skip #N/A and report missing columns', () => {
  const rows = [
    ['date', 'sa_mfg_composite', 'sa_mfg_new_orders_c', 'sa_mfg_ship_c', 'sa_mfg_emp_c', 'sa_mfg_vend_lead_c'],
    ['2026-09-01', 4, '#N/A', 7, 3, 12],
    ['2026-08-01', 1, -9, '5', 2, 10],
  ]
  const { series, missing } = parseSurveyRows(rows, RICHMOND_SURVEY.columns)
  assert.deepEqual(series.headline.observations.map(point => point.date), ['2026-08-01', '2026-09-01'])
  assert.deepEqual(series.newOrders.observations, [{ date: '2026-08-01', value: -9 }])
  assert.equal(series.shipments.observations[0].value, 5)
  assert.deepEqual(missing, ['sa_mfg_raw_mats_inv_c'])
})

test('Dallas production stands in for shipments in the ISM-equivalent composite', () => {
  const rows = [
    ['date', 'prod', 'vnwo', 'nemp', 'dtm', 'fgi'],
    ['Oct-26', 10, 20, 0, -10, 4],
  ]
  const { series } = parseSurveyRows(rows, DALLAS_SURVEY.columns)
  assert.equal(series.production.observations[0].value, 10)
  // (55 + 60 + 50 + 45 + 52) / 5
  close(ismEquivalentComposite(series)[0].value, 52.4)
})

test('district composite needs every district for a month', () => {
  const complete = value => Object.fromEntries(['newOrders', 'shipments', 'employment', 'deliveryTime', 'inventories']
    .map(key => [key, obs([['2026-09-01', value], ['2026-10-01', value]])]))
  const regional = {
    empire: { series: complete(10) },
    philly: { series: complete(0) },
    richmond: { series: complete(-10) },
    dallas: { series: { ...complete(20), inventories: obs([['2026-09-01', 20]]) } },
  }
  const four = districtComposite(regional)
  assert.deepEqual(four.map(point => point.date), ['2026-09-01'])
  close(four[0].value, (55 + 50 + 45 + 60) / 4)
  assert.equal(districtComposite(regional, ['empire', 'philly']).length, 2)
})

test('release-day helpers find the fourth Tuesday and last Monday', () => {
  assert.equal(nthWeekday(2026, 9, 2, 4).toISOString().slice(0, 10), '2026-10-27')
  assert.equal(lastWeekday(2026, 9, 1).toISOString().slice(0, 10), '2026-10-26')
  assert.equal(lastWeekday(2026, 10, 1).toISOString().slice(0, 10), '2026-11-30')
})
