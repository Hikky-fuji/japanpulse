// Monthly Labour Survey (毎月勤労統計) helpers.
//
// MHLW rotates part of the sample every January, so the headline (all-
// establishment) year-over-year rates carry sample-change breaks. MHLW also
// publishes nominal Y/Y rates for establishments sampled in both months
// (共通事業所, "same establishment"), the basis the BOJ emphasises. MHLW does
// not publish a same-establishment real wage.

const finite = value => Number.isFinite(value)

// Column positions in MHLW's kyo{yymm}{p|r}.xlsx, sheet 共通事業所 (industry
// total; 計 = all employment types, 一般 = full-time, パート = part-time).
export const SAME_ESTABLISHMENT_COLUMNS = {
  nominal: 3,
  nominalFullTime: 4,
  nominalPartTime: 5,
  scheduled: 9,
  scheduledFullTime: 10,
  scheduledPartTime: 11,
}

// The CPI deflator MHLW used for its official real wage, recovered from its
// own nominal and real Y/Y rates (both all establishments, same month).
export function impliedDeflator(nominalYoy, realYoy) {
  return finite(nominalYoy) && finite(realYoy) && realYoy > -100
    ? ((1 + nominalYoy / 100) / (1 + realYoy / 100) - 1) * 100
    : null
}

// Same-establishment nominal Y/Y deflated by that implied deflator. A derived
// proxy, not an MHLW statistic; inputs are published to one decimal, so the
// result carries roughly ±0.1 pt of rounding.
export function deflate(nominalYoy, deflatorYoy) {
  return finite(nominalYoy) && finite(deflatorYoy) && deflatorYoy > -100
    ? ((1 + nominalYoy / 100) / (1 + deflatorYoy / 100) - 1) * 100
    : null
}

// Monthly rows keyed by 'YYYY/MM' from Y/Y series ({ date, yoy }): the
// official series plus the derived deflator, same-establishment real wage and
// the all-minus-same gap (the sample-change effect). Derived values stay blank
// unless every input exists that month.
export function wageRows(series = {}) {
  const maps = Object.fromEntries(Object.entries(series).map(([key, list]) => [
    key,
    new Map((list || []).filter(item => finite(item?.yoy)).map(item => [item.date, item.yoy])),
  ]))
  const dates = [...new Set(Object.values(maps).flatMap(map => [...map.keys()]))].sort()
  return dates.map(date => {
    const row = Object.fromEntries(Object.keys(maps).map(key => [key, maps[key].get(date) ?? null]))
    const deflator = impliedDeflator(row.nominal, row.real)
    return {
      date,
      ...row,
      deflator,
      realSame: deflate(row.nominalSame, deflator),
      sampleGap: finite(row.nominal) && finite(row.nominalSame) ? row.nominal - row.nominalSame : null,
    }
  })
}
