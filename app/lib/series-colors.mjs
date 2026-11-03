// One color per indicator concept, shared by every page, so "food" or "core"
// looks the same on US CPI, Japan CPI, PCE and the policy pages.
//
// Values are the dark-surface steps of the validated categorical palette
// (dataviz validator, dark mode, panel #30363a). Every page renders charts on
// that panel, including those whose inline styles were written for a light theme. Each chart's co-plotted set
// was checked in the series order listed in CHART_ORDERS; keep that order
// when adding a dataset. Concepts that never share a chart may reuse a hue
// (e.g. median and food), but one concept never has two colors.

const SLOT = {
  blue: '#3987e5',
  orange: '#d95926',
  aqua: '#199e70',
  yellow: '#c98500',
  magenta: '#d55181',
  green: '#008300',
  violet: '#9085e9',
  red: '#e66767',
}


export const SERIES_COLORS = {
  // Inflation aggregates
  headline: SLOT.blue,
  core: SLOT.orange,
  coreCore: SLOT.violet,           // Japan: ex fresh food and energy
  supercore: SLOT.magenta,         // US CPI core services less shelter; PCE services ex energy & housing
  goods: SLOT.green,               // goods / core goods
  services: SLOT.violet,           // services / core services
  // Inflation components
  food: SLOT.aqua,
  energy: SLOT.yellow,
  shelter: SLOT.red,               // US rent of shelter; Japan housing
  medical: SLOT.blue,
  transportation: SLOT.magenta,
  // Underlying-inflation measures (plotted with core, never with food/energy)
  median: SLOT.aqua,
  trimmedMean: SLOT.yellow,
  sticky: SLOT.violet,             // Atlanta Fed sticky core; BOJ mode
  // Household demand and income
  consumption: SLOT.blue,          // real PCE, real restaurant sales
  disposableIncome: SLOT.aqua,
  nominalSpending: SLOT.yellow,    // nominal restaurant sales
  compensation: SLOT.blue,
  proprietorsIncome: SLOT.yellow,
  rentalIncome: SLOT.aqua,
  assetIncome: SLOT.violet,
  transfers: SLOT.magenta,
  socialContributions: SLOT.green,
  // Labor
  unemployment: SLOT.blue,         // U-3
  underemployment: SLOT.orange,    // U-6
  participation: SLOT.blue,        // 16+ participation
  primeParticipation: SLOT.magenta,
  primeEmployment: SLOT.violet,
  wages: SLOT.blue,                // average hourly earnings (momentum shown dashed, same hue)
  realWages: SLOT.red,
  scheduledWages: SLOT.aqua,       // Japan scheduled earnings (same-establishment variants dashed)
  wageTracker: SLOT.aqua,          // Atlanta Fed wage growth tracker
  employmentCostIndex: SLOT.yellow,
  fomcProjection: SLOT.yellow,     // SEP median unemployment
  payrollTotal: '#e6eaec',         // total nonfarm line over the sector stack
  // Policy
  policyRate: '#e6eaec',           // effective fed funds: neutral ink so the rules carry the hues
  taylor1993: SLOT.blue,
  balancedApproach: SLOT.aqua,
  claridaProxy: SLOT.violet,
  bullardModernized: SLOT.red,
  // Manufacturing surveys
  empire: SLOT.blue,
  philly: SLOT.magenta,
  richmond: SLOT.violet,
  dallas: SLOT.yellow,
  regionalComposite: SLOT.aqua,
  ism: SLOT.orange,
}

// Series orders whose adjacent pairs pass the validator on the dark panel.
export const CHART_ORDERS = {
  inflationTrend: ['core', 'headline', 'supercore'],
  underlying: ['core', 'median', 'trimmedMean', 'sticky'],
  japanTrend: ['headline', 'core', 'coreCore'],
  bojUnderlying: ['sticky', 'trimmedMean', 'median', 'headline'],
  headlineSplit: ['energy', 'food', 'core'],
  incomeSources: ['compensation', 'proprietorsIncome', 'rentalIncome', 'assetIncome', 'transfers', 'socialContributions'],
  dining: ['nominalSpending', 'consumption', 'food'],
  japanWages: ['wages', 'realWages', 'scheduledWages'],
  goodsServices: ['goods', 'supercore', 'services', 'core'],
  cpiBlocks: ['food', 'energy', 'goods', 'shelter', 'medical', 'transportation', 'services'],
  taylorRules: ['taylor1993', 'balancedApproach', 'claridaProxy', 'bullardModernized'],
}

export const seriesColor = concept => SERIES_COLORS[concept]

