import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ISM_EQUIVALENT_COMPONENTS,
  averageSeries,
  districtComponent,
  movingAverage,
  spreadSeries,
  ismEquivalent,
  ismEquivalentComposite,
  trackingStats,
} from '../app/lib/regional-ism.mjs'

const close = (actual, expected, digits = 6) => assert.ok(Math.abs(actual - expected) < 10 ** -digits, `${actual} != ${expected}`)
const obs = (pairs) => pairs.map(([date, value]) => ({ date, value }))

test('ISM-equivalent conversion matches %higher + %same / 2', () => {
  // 30% higher, 50% same, 20% lower: DI = 10, ISM-style = 30 + 25 = 55.
  close(ismEquivalent(30 - 20), 30 + 50 / 2)
  assert.equal(ismEquivalent(0), 50)
  assert.equal(ismEquivalent(null), null)
})

test('composite uses the five ISM counterparts and blanks incomplete months', () => {
  assert.deepEqual(ISM_EQUIVALENT_COMPONENTS.map(item => item.ism), ['newOrders', 'production', 'employment', 'supplierDeliveries', 'inventories'])
  const series = Object.fromEntries(ISM_EQUIVALENT_COMPONENTS.map((component, index) => [
    component.key,
    { observations: obs([['2026-08-01', index * 2], ['2026-09-01', 10]]) },
  ]))
  series.inventories.observations = obs([['2026-09-01', 10]])
  const composite = ismEquivalentComposite(series)
  assert.deepEqual(composite.map(point => point.date), ['2026-08-01', '2026-09-01'])
  assert.equal(composite[0].value, null)
  close(composite[1].value, 55)
})

test('average series needs every input for a month', () => {
  const result = averageSeries([obs([['2026-08-01', 50], ['2026-09-01', 52]]), obs([['2026-09-01', 48]])])
  assert.deepEqual(result.map(point => point.value), [null, 50])
})

test('tracking stats report bias, MAE, RMSE and correlation', () => {
  const actual = obs([['2026-01-01', 50], ['2026-02-01', 52], ['2026-03-01', 54], ['2026-04-01', 56]])
  const estimate = obs([['2026-01-01', 51], ['2026-02-01', 53], ['2026-03-01', 55], ['2026-04-01', 57]])
  const stats = trackingStats(estimate, actual)
  assert.equal(stats.n, 4)
  close(stats.bias, 1)
  close(stats.mae, 1)
  close(stats.rmse, 1)
  close(stats.correlation, 1)
  assert.equal(trackingStats(estimate.slice(0, 2), actual).correlation, null)
})

test('district component averages one series on the ISM scale across districts', () => {
  const regional = {
    empire: { series: { pricesPaid: { observations: obs([['2026-09-01', 40], ['2026-10-01', 30]]) } } },
    philly: { series: { pricesPaid: { observations: obs([['2026-10-01', 50]]) } } },
    dallas: { series: { pricesPaid: { observations: obs([['2026-10-01', 10]]) } } },
  }
  const paid = districtComponent(regional, ['pricesPaid'], ['empire', 'philly', 'dallas'])
  assert.deepEqual(paid.map(point => point.date), ['2026-10-01'])
  close(paid[0].value, (65 + 75 + 55) / 3)
  assert.deepEqual(districtComponent(regional, ['pricesPaid'], ['empire', 'richmond']), [])
})

test('spread subtracts matching months only', () => {
  const result = spreadSeries(obs([['2026-09-01', 55], ['2026-10-01', 56]]), obs([['2026-10-01', 51]]))
  assert.deepEqual(result, [{ date: '2026-10-01', value: 5 }])
})

test('moving average needs consecutive months', () => {
  const result = movingAverage(obs([['2026-06-01', 1], ['2026-07-01', 2], ['2026-08-01', 3], ['2026-10-01', 4]]))
  assert.deepEqual(result.map(point => point.value), [null, null, 2, null])
})
