import test from 'node:test'
import assert from 'node:assert/strict'
import { averageByMonth, parseFredCsv } from '../app/lib/fred.js'

test('parses FRED CSV and ignores missing observations', () => {
  const series = parseFredCsv('DATE,VALUE\n2026-01-01,1.5\n2026-02-01,.\n2026-03-01,2.25\n')
  assert.deepEqual(series, [
    { date: '2026-01-01', value: 1.5 },
    { date: '2026-03-01', value: 2.25 },
  ])
})

test('aggregates daily CSV observations to monthly averages', () => {
  assert.deepEqual(averageByMonth([
    { date: '2026-01-02', value: 2 },
    { date: '2026-01-03', value: 4 },
    { date: '2026-02-01', value: 8 },
  ]), [
    { date: '2026-01-01', value: 3 },
    { date: '2026-02-01', value: 8 },
  ])
})
