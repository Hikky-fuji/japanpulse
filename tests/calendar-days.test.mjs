import test from 'node:test'
import assert from 'node:assert/strict'
import { calendarDaysUntil } from '../app/lib/calendar-days.mjs'

test('release countdown treats the current calendar date as today', () => {
  assert.equal(calendarDaysUntil('2026-08-28', new Date(2026, 7, 28, 0, 1)), 0)
  assert.equal(calendarDaysUntil('2026-08-28', new Date(2026, 7, 28, 23, 59)), 0)
})

test('release countdown crosses month boundaries without partial-day rounding', () => {
  assert.equal(calendarDaysUntil('2026-09-01', new Date(2026, 7, 31, 20, 0)), 1)
  assert.equal(calendarDaysUntil('2026-08-27', new Date(2026, 7, 28, 9, 0)), -1)
  assert.equal(calendarDaysUntil('not-a-date', new Date(2026, 7, 28)), null)
})
