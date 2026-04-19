export const dynamic = 'force-dynamic'

const APP_ID = process.env.ESTAT_APP_ID
const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// Cabinet Office quarterly GDP - real SA series (2020 base, up to 2025 Q4)
const STATS_ID_LEVELS = '0003109750'  // 実質季節調整系列 実額
const STATS_ID_QOQ    = '0003113542'  // 実質季節調整系列 前期比・寄与度

// cat01 codes
const CAT_GDP    = '11'  // 国内総生産(支出側)
const CAT_CONS   = '12'  // 民間最終消費支出
const CAT_GOVT   = '18'  // 政府最終消費支出
const CAT_INVEST = '34'  // <参考>総固定資本形成
const CAT_EXP    = '22'  // 財貨・サービスの輸出
const CAT_IMP    = '23'  // 財貨・サービスの輸入

// time format: YYYYMM1MM2 e.g. 1994000103 = 1994 Q1 (months 01-03)
function parseTime(t) {
  const s = String(t)
  if (s.length !== 10) return null
  const year = s.slice(0, 4)
  const m1 = s.slice(6, 8)
  const qMap = { '01': 1, '04': 2, '07': 3, '10': 4 }
  const q = qMap[m1]
  return q ? `${year}-Q${q}` : null
}

async function fetchSeries(statsId, cat, tab) {
  let url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${statsId}`
    + `&metaGetFlg=N&cdCat01=${cat}`
  if (tab) url += `&cdTab=${tab}`
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
  return (Array.isArray(values) ? values : [values])
    .filter(v => v?.['@time'] && v?.['$'])
    .map(v => {
      const date = parseTime(v['@time'])
      if (!date) return null
      return { date, value: parseFloat(v['$']) }
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-24)
}

const qoq = (arr) => arr.map((v, i) => {
  if (i === 0) return null
  return { date: v.date, value: parseFloat(((v.value - arr[i-1].value) / arr[i-1].value * 100).toFixed(2)) }
}).filter(Boolean)

const yoy = (arr) => arr.map((v, i) => {
  if (i < 4) return null
  return { date: v.date, value: parseFloat(((v.value - arr[i-4].value) / arr[i-4].value * 100).toFixed(2)) }
}).filter(Boolean)

export async function GET() {
  try {
    // Fetch levels from 0003109750 and QoQ/contributions from 0003113542
    // Tab codes for 0003113542: 13=寄与度, 14=前期比, 15=前期比・年率
    const [gdpLevel, gdpQoQ, consContrib, govtContrib, investContrib, netExpContrib] = await Promise.all([
      fetchSeries(STATS_ID_LEVELS, CAT_GDP),
      fetchSeries(STATS_ID_QOQ, CAT_GDP, '14'),       // 前期比
      fetchSeries(STATS_ID_QOQ, CAT_CONS, '13'),      // 寄与度
      fetchSeries(STATS_ID_QOQ, CAT_GOVT, '13'),      // 寄与度
      fetchSeries(STATS_ID_QOQ, '34', '13'),           // <参考>総固定資本形成 寄与度
      fetchSeries(STATS_ID_QOQ, '21', '13'),           // 財貨・サービス_純輸出 寄与度
    ])

    if (!gdpLevel.length) throw new Error('No GDP data returned from e-Stat')

    const gdpYoY = yoy(gdpLevel)

    // Align contributions to gdpQoQ dates
    const alignTo = (base, arr) => {
      const map = Object.fromEntries(arr.map(v => [v.date, v.value]))
      return base.map(v => ({ date: v.date, value: map[v.date] ?? null }))
    }

    const consMap    = Object.fromEntries(consContrib.map(v => [v.date, v.value]))
    const govtMap    = Object.fromEntries(govtContrib.map(v => [v.date, v.value]))
    const investMap  = Object.fromEntries(investContrib.map(v => [v.date, v.value]))
    const netExpMap  = Object.fromEntries(netExpContrib.map(v => [v.date, v.value]))

    const contributions = gdpQoQ.slice(-12).map(v => ({
      date: v.date,
      gdp_qoq: v.value,
      cons:    consMap[v.date] ?? null,
      govt:    govtMap[v.date] ?? null,
      invest:  investMap[v.date] ?? null,
      net_exp: netExpMap[v.date] ?? null,
    }))

    return Response.json({
      gdp_qoq:       gdpQoQ.slice(-16),
      gdp_yoy:       gdpYoY.slice(-16),
      gdp_levels:    gdpLevel.slice(-16),
      contributions,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
