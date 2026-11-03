import assert from 'node:assert/strict'
import test from 'node:test'

import { SAME_ESTABLISHMENT_COLUMNS, deflate, impliedDeflator, wageRows } from '../app/lib/japan-wages.mjs'

const close = (actual, expected, digits = 6) => assert.ok(Math.abs(actual - expected) < 10 ** -digits, `${actual} != ${expected}`)

test('implied deflator inverts the official real-wage identity', () => {
  // Nominal +3.0%, CPI +2.0% -> real (1.03 / 1.02 - 1) = +0.980%
  const real = (1.03 / 1.02 - 1) * 100
  close(impliedDeflator(3, real), 2)
  close(deflate(3, 2), real)
  assert.equal(impliedDeflator(null, 1), null)
  assert.equal(deflate(2, null), null)
})

test('wage rows derive same-establishment real wages and the sample gap', () => {
  const rows = wageRows({
    nominal: [{ date: '2026/07', yoy: 3.4 }, { date: '2026/08', yoy: 1.5 }],
    real: [{ date: '2026/07', yoy: 0.3 }, { date: '2026/08', yoy: -1.4 }],
    nominalSame: [{ date: '2026/08', yoy: 2.8 }],
  })
  assert.deepEqual(rows.map(row => row.date), ['2026/07', '2026/08'])
  assert.equal(rows[0].realSame, null)
  const deflator = (1.015 / 0.986 - 1) * 100
  close(rows[1].deflator, deflator)
  close(rows[1].realSame, (1.028 / (1 + deflator / 100) - 1) * 100)
  close(rows[1].sampleGap, 1.5 - 2.8)
})

test('same-establishment columns match the MHLW workbook layout', () => {
  assert.deepEqual(SAME_ESTABLISHMENT_COLUMNS, {
    nominal: 3, nominalFullTime: 4, nominalPartTime: 5, scheduled: 9, scheduledFullTime: 10, scheduledPartTime: 11,
  })
})

test('wages API reads the official Japanese real wage, not the international table', async () => {
  const { readFileSync } = await import('node:fs')
  const route = readFileSync(new URL('../app/api/wages/route.js', import.meta.url), 'utf8')
  // t06 is MHLW's international comparison (column 3 is the US real hourly wage).
  assert.doesNotMatch(route, /fetchPair\('t06'/)
  assert.match(route, /extractSection\(r, '現金給与総額', 2, 4\)/)
  // Final (r) workbooks win over preliminary (p) ones for the same month.
  assert.match(route, /fetchPair\('t01', \['r', 'p'\]\)/)
})
