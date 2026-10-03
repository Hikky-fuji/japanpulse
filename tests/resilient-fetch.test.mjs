import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchWithRetry } from '../app/lib/resilient-fetch.js'

test('retries a transient 503 and returns the recovery response', async () => {
  let calls = 0
  const response = await fetchWithRetry('https://example.test', {}, {
    retryDelayMs: 0,
    sleepImpl: async () => {},
    fetchImpl: async () => new Response(++calls === 1 ? 'busy' : 'ok', {
      status: calls === 1 ? 503 : 200,
    }),
  })

  assert.equal(calls, 2)
  assert.equal(response.status, 200)
})

test('does not retry a permanent 404', async () => {
  let calls = 0
  const response = await fetchWithRetry('https://example.test', {}, {
    fetchImpl: async () => {
      calls += 1
      return new Response('missing', { status: 404 })
    },
  })

  assert.equal(calls, 1)
  assert.equal(response.status, 404)
})

test('retries a network error and throws after attempts are exhausted', async () => {
  let calls = 0
  await assert.rejects(
    fetchWithRetry('https://example.test', {}, {
      attempts: 2,
      retryDelayMs: 0,
      sleepImpl: async () => {},
      fetchImpl: async () => {
        calls += 1
        throw new Error('connection reset')
      },
    }),
    /connection reset/
  )
  assert.equal(calls, 2)
})
