export const dynamic = 'force-dynamic'

const APP_ID = process.env.ESTAT_APP_ID
const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// 機械受注統計調査 主要需要者別 月次 (原系列・季調系列)
const STATS_ID = '0003355222'

// cat01: 需要者分類
const CAT_CORE   = '160'  // 民間需要(船舶・電力を除く) — コア機械受注
const CAT_MFG    = '170'  // 民間需要_製造業計
const CAT_NONMFG = '190'  // 民間需要_非製造業(船舶を除く)
const CAT_EXT    = '120'  // 海外需要

// cat02: 系列
const SA  = '100'  // 季調系列
const NSA = '110'  // 原系列

// GDP設備投資: 実質SA実額 (2020年基準)
const GDP_STATS_ID  = '0003109750'
const CAT_GDP_CAP   = '34'  // <参考>総固定資本形成

function parseMonthly(t) {
  const s = String(t)
  if (s.length !== 10) return null
  return s.slice(0, 4) + '/' + s.slice(6, 8)
}

function parseQuarterly(t) {
  const s = String(t)
  if (s.length !== 10) return null
  const year = s.slice(0, 4)
  const m1 = s.slice(6, 8)
  const qMap = { '01': 'Q1', '04': 'Q2', '07': 'Q3', '10': 'Q4' }
  const q = qMap[m1]
  return q ? `${year}-${q}` : null
}

async function fetchMonthly(cat01, cat02, limit = 40) {
  const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${STATS_ID}`
    + `&metaGetFlg=N&cdCat01=${cat01}&cdCat02=${cat02}&limit=${limit}`
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
  return (Array.isArray(values) ? values : [values])
    .filter(v => v?.['@time'] && v?.['$'])
    .map(v => {
      const date = parseMonthly(v['@time'])
      if (!date) return null
      return { date, value: parseFloat(v['$']) }
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function fetchGDPCapex() {
  // No limit — fetch all quarters and slice at the end
  const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${GDP_STATS_ID}`
    + `&metaGetFlg=N&cdCat01=${CAT_GDP_CAP}`
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
  return (Array.isArray(values) ? values : [values])
    .filter(v => v?.['@time'] && v?.['$'])
    .map(v => {
      const date = parseQuarterly(v['@time'])
      if (!date) return null
      return { date, value: parseFloat(v['$']) }
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
}

function calcYoY(series) {
  const map = Object.fromEntries(series.map(d => [d.date, d.value]))
  return series.map(d => {
    const [y, m] = d.date.split('/')
    const priorDate = `${parseInt(y) - 1}/${m}`
    if (map[priorDate] != null && d.value != null) {
      return { date: d.date, value: parseFloat(((d.value - map[priorDate]) / map[priorDate] * 100).toFixed(2)) }
    }
    return null
  }).filter(Boolean)
}

function calcQoQ4(series) {
  // Year-over-year for quarterly data (4-quarter lag)
  return series.map((d, i) => {
    if (i < 4) return null
    const prev = series[i - 4]
    if (d.value != null && prev.value != null) {
      return { date: d.date, value: parseFloat(((d.value - prev.value) / prev.value * 100).toFixed(2)) }
    }
    return null
  }).filter(Boolean)
}

function calcMoM(series) {
  return series.map((d, i) => {
    if (i === 0) return null
    const prev = series[i - 1]
    if (d.value != null && prev.value != null) {
      return { date: d.date, value: parseFloat(((d.value - prev.value) / prev.value * 100).toFixed(2)) }
    }
    return null
  }).filter(Boolean)
}

export async function GET() {
  try {
    const [coreNSA, coreSA, mfgNSA, nonMfgNSA, extNSA, capexLevels] = await Promise.all([
      fetchMonthly(CAT_CORE, NSA, 40),
      fetchMonthly(CAT_CORE, SA, 30),
      fetchMonthly(CAT_MFG, NSA, 40),
      fetchMonthly(CAT_NONMFG, NSA, 40),
      fetchMonthly(CAT_EXT, NSA, 40).catch(e => { console.warn('[MachineOrders] EXT fetch failed:', e.message); return [] }),
      fetchGDPCapex().catch(e => { console.warn('[MachineOrders] GDP capex fetch failed:', e.message); return [] }),
    ])

    if (!coreNSA.length) throw new Error('No core machine orders data returned from e-Stat')

    const coreYoY    = calcYoY(coreNSA)
    const coreMoM    = calcMoM(coreSA)
    const mfgYoY     = calcYoY(mfgNSA)
    const nonMfgYoY  = calcYoY(nonMfgNSA)
    const capexYoY   = calcQoQ4(capexLevels)

    const allDates = coreNSA.slice(-24).map(d => d.date)
    const latestDate = allDates.at(-1)
    const prevDate   = allDates.at(-2)

    const toMap = (arr) => Object.fromEntries(arr.map(d => [d.date, d.value]))
    const coreNSAMap   = toMap(coreNSA)
    const coreYoYMap   = toMap(coreYoY)
    const coreMoMMap   = toMap(coreMoM)
    const mfgYoYMap    = toMap(mfgYoY)
    const nonMfgYoYMap = toMap(nonMfgYoY)

    return Response.json({
      latest: {
        date:     latestDate,
        yoy:      coreYoYMap[latestDate]  ?? null,
        mom:      coreMoMMap[latestDate]  ?? null,
        // 単位: 百万円 → 兆円 (÷1,000,000)
        level:    coreNSAMap[latestDate] != null ? parseFloat((coreNSAMap[latestDate] / 1_000_000).toFixed(3)) : null,
        yoyPrev:  coreYoYMap[prevDate]   ?? null,
        momPrev:  coreMoMMap[prevDate]   ?? null,
      },
      series: allDates.map(date => ({
        date,
        coreYoY:    coreYoYMap[date]    ?? null,
        coreMoM:    coreMoMMap[date]    ?? null,
        mfgYoY:     mfgYoYMap[date]    ?? null,
        nonMfgYoY:  nonMfgYoYMap[date] ?? null,
      })),
      // GDP設備投資Y/Y (四半期、last 12 quarters)
      gdpCapex: capexYoY.slice(-12),
    })
  } catch (e) {
    console.error('[MachineOrders]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
