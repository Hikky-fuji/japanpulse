import test from 'node:test'
import assert from 'node:assert/strict'
import { momentumSignal, movingAverage, yoyMomentum } from '../app/lib/japan-cpi-momentum.mjs'

test('three-month moving average preserves dates and smooths year-over-year rates', () => {
  const result = movingAverage([
    { date: '2026/04', value: 1.2 },
    { date: '2026/05', value: 1.5 },
    { date: '2026/06', value: 1.8 },
  ])

  assert.equal(result[0].value, null)
  assert.equal(result[1].value, null)
  assert.equal(result[2].date, '2026/06')
  assert.equal(result[2].value, 1.5)
})

test('momentum compares successive three-month averages and aligns NSA monthly data', () => {
  const result = yoyMomentum([
    { date: '2026/03', value: 1.0 },
    { date: '2026/04', value: 1.2 },
    { date: '2026/05', value: 1.5 },
    { date: '2026/06', value: 1.8 },
  ], [
    { date: '2026/05', value: 0.1 },
    { date: '2026/06', value: 0.3 },
  ])

  assert.equal(result.yoy, 1.8)
  assert.ok(Math.abs(result.mma3 - 1.5) < 1e-12)
  assert.ok(Math.abs(result.mma3Change - (1.5 - 1.2333333333333334)) < 1e-12)
  assert.equal(result.monthlyNsa, 0.3)
})

test('momentum signal distinguishes acceleration, cooling and noise', () => {
  assert.equal(momentumSignal(0.2), 'Accelerating')
  assert.equal(momentumSignal(-0.2), 'Cooling')
  assert.equal(momentumSignal(0.02), 'Stable')
  assert.equal(momentumSignal(null), 'Unavailable')
})
