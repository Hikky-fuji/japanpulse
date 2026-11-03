import { observationMap } from './us-cpi-scenarios.mjs'

const finite = value => Number.isFinite(value)

// The ISM PMI is the equal-weighted average of five diffusion indexes:
// new orders, production, employment, supplier deliveries and inventories.
// The regional Fed surveys publish the closest counterparts, so an
// ISM-equivalent regional composite uses the same five, mapped one to one.
// `keys` lists the regional series in order of preference (Dallas publishes
// production itself; the other surveys use shipments as the closest match).
export const ISM_EQUIVALENT_COMPONENTS = [
  { key: 'newOrders', keys: ['newOrders'], label: 'New orders', ism: 'newOrders', ismLabel: 'New orders' },
  { key: 'shipments', keys: ['production', 'shipments'], label: 'Production / shipments', ism: 'production', ismLabel: 'Production' },
  { key: 'employment', keys: ['employment'], label: 'Employment', ism: 'employment', ismLabel: 'Employment' },
  { key: 'deliveryTime', keys: ['deliveryTime'], label: 'Delivery time', ism: 'supplierDeliveries', ismLabel: 'Supplier deliveries' },
  { key: 'inventories', keys: ['inventories'], label: 'Inventories', ism: 'inventories', ismLabel: 'Inventories' },
]

// The districts in the ISM-equivalent composite, in release order.
export const COMPOSITE_DISTRICTS = ['empire', 'philly', 'richmond', 'dallas']
export const EARLY_READ_DISTRICTS = ['empire', 'philly']

export function componentSeries(series = {}, component) {
  const key = component.keys.find(candidate => series?.[candidate]?.observations?.length)
  return key ? series[key].observations : []
}

// A regional diffusion index is %higher - %lower. With %higher + %same +
// %lower = 100, the ISM-style index %higher + %same/2 equals 50 + DI/2.
export const ismEquivalent = value => finite(value) ? 50 + value / 2 : null

// Monthly ISM-equivalent composite for one survey: the mean of the five
// converted components. A month with any component missing stays blank.
export function ismEquivalentComposite(series = {}) {
  const maps = ISM_EQUIVALENT_COMPONENTS.map(component => observationMap(componentSeries(series || {}, component)))
  const dates = [...new Set(maps.flatMap(map => [...map.keys()]))].sort()
  return dates.map(date => {
    const values = maps.map(map => ismEquivalent(map.get(date)))
    return { date, value: values.every(finite) ? values.reduce((sum, value) => sum + value, 0) / values.length : null }
  })
}

// Equal-weight average of several monthly series; blank unless all are present.
export function averageSeries(seriesList = []) {
  const maps = seriesList.map(series => observationMap(series || []))
  const dates = [...new Set(maps.flatMap(map => [...map.keys()]))].sort()
  return dates.map(date => {
    const values = maps.map(map => map.get(date))
    return { date, value: values.length && values.every(finite) ? values.reduce((sum, value) => sum + value, 0) / values.length : null }
  })
}

// Descriptive fit of an estimate against the published value over the
// months where both exist: error = estimate - actual.
export function trackingStats(estimate = [], actual = []) {
  const estimates = observationMap(estimate || [])
  const pairs = (actual || [])
    .filter(point => finite(point.value) && finite(estimates.get(point.date)))
    .map(point => [estimates.get(point.date), point.value])
  if (pairs.length < 3) return { n: pairs.length, correlation: null, bias: null, mae: null, rmse: null }
  const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length
  const xs = pairs.map(pair => pair[0])
  const ys = pairs.map(pair => pair[1])
  const errors = pairs.map(([x, y]) => x - y)
  const mx = mean(xs)
  const my = mean(ys)
  const covariance = pairs.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0)
  const spread = Math.sqrt(xs.reduce((sum, x) => sum + (x - mx) ** 2, 0) * ys.reduce((sum, y) => sum + (y - my) ** 2, 0))
  return {
    n: pairs.length,
    correlation: spread ? covariance / spread : null,
    bias: mean(errors),
    mae: mean(errors.map(Math.abs)),
    rmse: Math.sqrt(mean(errors.map(error => error ** 2))),
  }
}

// Offline check against ISM history (owner's licensed export Jan 2017 –
// Apr 2023, plus the manually verified Oct 2025 – Sep 2026 snapshot; n = 88).
// Regional inputs are current-vintage official series, not real-time
// vintages. Only summary statistics are kept; no third-party ISM values are
// redistributed. The composite has no fitted parameters.
export const ISM_EQUIVALENT_VALIDATION = {
  window: 'Jan 2017 – Apr 2023 and Oct 2025 – Sep 2026',
  n: 88,
  fourDistrict: { correlation: 0.891, bias: -0.17, mae: 1.59, rmse: 2.16 },
  earlyRead: { correlation: 0.813, bias: 0.2, mae: 2.11, rmse: 2.87 },
  previousIsm: { mae: 1.35, rmse: 1.95 },
  rawHeadlines: { mae: 12.5 },
}

// Equal-weight composite across districts; a month is blank unless every
// listed district has a complete five-component reading.
export function districtComposite(regional = {}, districts = COMPOSITE_DISTRICTS) {
  return averageSeries(districts.map(key => ismEquivalentComposite(regional?.[key]?.series)))
    .filter(point => finite(point.value))
}
