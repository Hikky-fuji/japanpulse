export const SIGNIFICANCE_LEVELS = {
  3: {
    label: 'Core',
    stars: '★★★',
    description: 'Primary signal for the macro cycle, policy or markets',
  },
  2: {
    label: 'Supporting',
    stars: '★★',
    description: 'Important confirmation, leading detail or transmission channel',
  },
  1: {
    label: 'Specialized',
    stars: '★',
    description: 'Focused sector signal best read alongside broader indicators',
  },
}

export const SIGNIFICANCE_BY_PATH = {
  '/cpi': 3,
  '/tokyo-cpi': 2,
  '/ppi': 2,
  '/gdp': 3,
  '/iip': 2,
  '/tsip': 2,
  '/machine-orders': 2,
  '/consumption': 2,
  '/tankan': 3,
  '/watcher': 2,
  '/wages': 3,
  '/labour': 3,
  '/job-ratio': 2,
  '/trade': 2,
  '/inbound-tourism': 2,
  '/us/cpi': 3,
  '/us/ppi': 2,
  '/us/consumption': 3,
  '/us/manufacturing': 3,
  '/us/employment': 3,
  '/us/initial-claims': 2,
  '/us/jolts': 2,
  '/us-macro': 3,
}

export function significanceForPath(pathname) {
  return SIGNIFICANCE_BY_PATH[pathname] ?? null
}

export function significanceDefinition(level) {
  return SIGNIFICANCE_LEVELS[level] ?? SIGNIFICANCE_LEVELS[1]
}
