const baseUrl = (process.env.BASE_URL || 'https://japanpulse.vercel.app').replace(/\/$/, '')

const checks = [
  { path: '/api/cpi', required: ['headline'] },
  { path: '/api/tokyo-cpi', required: ['headline'] },
  { path: '/api/ppi', required: ['cgpi', 'sppi'] },
  { path: '/api/boj-policy', required: ['latest', 'meta'] },
  { path: '/api/yen-transmission', required: ['latest'] },
  { path: '/api/gdp', required: ['gdp_qoq'] },
  { path: '/api/iip', required: ['鉱工業'] },
  { path: '/api/tsip', required: ['latest'] },
  { path: '/api/machine-orders', required: ['latest'] },
  { path: '/api/consumption', required: ['total'] },
  { path: '/api/housing', required: ['series', 'fetchedAt'] },
  { path: '/api/tankan', required: ['large_mfg'] },
  { path: '/api/watcher', required: ['current_all'] },
  { path: '/api/wages', required: ['nominal'] },
  { path: '/api/labour', required: ['data'] },
  { path: '/api/job-ratio', required: ['latest'] },
  { path: '/api/trade', required: ['export', 'import'] },
  { path: '/api/inbound-tourism', required: ['arrivalSummary'] },
  { path: '/api/us-cpi', required: ['series', 'fetchedAt'] },
  { path: '/api/us-ppi', required: ['series', 'fetchedAt'] },
  { path: '/api/us-consumption', required: ['series', 'fetchedAt', 'meta'] },
  { path: '/api/us-household-credit', required: ['series', 'latestQuarter', 'meta'] },
  { path: '/api/us-retail-sales', required: ['series', 'fetchedAt', 'meta'] },
  { path: '/api/us-housing', required: ['series', 'fetchedAt', 'meta'] },
  { path: '/api/us-employment', required: ['employment'] },
  { path: '/api/us-initial-claims', required: ['series', 'fetchedAt'] },
  { path: '/api/us-jolts', required: ['series', 'fetchedAt'] },
  { path: '/api/us-manufacturing', required: ['regional', 'ism'] },
  { path: '/api/us-macro', required: ['growth', 'policy'] },
  { path: '/api/us-rates', required: ['series', 'latest'] },
  { path: '/api/release-calendar', required: ['events', 'fetchedAt'] },
  { path: '/api/workspace-pulse?country=JP', required: ['sources', 'summary'] },
  { path: '/api/workspace-pulse?country=US', required: ['sources', 'summary'] },
  { path: '/api/data-health?country=JP', required: ['items', 'summary'] },
  { path: '/api/data-health?country=US', required: ['items', 'summary'] },
]

async function inspect(check) {
  const startedAt = Date.now()
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      headers: { 'User-Agent': 'JapanPulse production smoke test' },
      signal: AbortSignal.timeout(check.path.includes('data-health') ? 65000 : 30000),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    if (payload?.error) throw new Error(payload.error)
    for (const key of check.required) {
      if (payload?.[key] === undefined || payload?.[key] === null) throw new Error(`missing ${key}`)
    }
    if (check.path.includes('workspace-pulse') && payload.summary?.failed > 0) {
      throw new Error(`${payload.summary.failed} aggregated source(s) failed`)
    }
    if (check.path.includes('data-health') && payload.summary?.failed > 0) {
      throw new Error(`${payload.summary.failed} health check(s) failed`)
    }
    return { path: check.path, ok: true, durationMs: Date.now() - startedAt }
  } catch (error) {
    return { path: check.path, ok: false, durationMs: Date.now() - startedAt, error: error.message }
  }
}

const results = []
for (let index = 0; index < checks.length; index += 4) {
  results.push(...await Promise.all(checks.slice(index, index + 4).map(inspect)))
}

for (const result of results) {
  const state = result.ok ? 'PASS' : 'FAIL'
  console.log(`${state.padEnd(4)} ${String(result.durationMs).padStart(6)}ms  ${result.path}${result.error ? ` · ${result.error}` : ''}`)
}

const failures = results.filter(result => !result.ok)
console.log(`\n${results.length - failures.length}/${results.length} checks passed against ${baseUrl}`)
if (failures.length) process.exitCode = 1
