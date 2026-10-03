export class FetchTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

export const isRetryableStatus = status => status === 429 || status >= 500

const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

export async function fetchWithRetry(url, options = {}, config = {}) {
  const {
    attempts = 2,
    timeoutMs = 10000,
    retryDelayMs = 200,
    fetchImpl = fetch,
    sleepImpl = pause,
  } = config

  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetchImpl(url, { ...options, signal: controller.signal })
      if (!isRetryableStatus(response.status) || attempt === attempts) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error?.name === 'AbortError'
        ? new FetchTimeoutError(`Request timed out after ${timeoutMs}ms`)
        : error
      if (attempt === attempts) throw lastError
    } finally {
      clearTimeout(timeout)
    }

    await sleepImpl(retryDelayMs * attempt)
  }

  throw lastError || new Error('Request failed')
}
