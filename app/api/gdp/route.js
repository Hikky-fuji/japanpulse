export const dynamic = 'force-dynamic'

const APP_ID = process.env.ESTAT_APP_ID
const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// Cabinet Office quarterly GDP - real SA series (2011 chained prices)
// statsDataId: 0003376031
const STATS_ID = '0003376031'

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

async function fetchSeries(cat) {
  const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${STATS_ID}`
    + `&metaGetFlg=N&cdCat01=${cat}&limit=40`
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
    const [gdp, cons, govt, invest, exp, imp] = await Promise.all([
      fetchSeries(CAT_GDP),
      fetchSeries(CAT_CONS),
      fetchSeries(CAT_GOVT),
      fetchSeries(CAT_INVEST),
      fetchSeries(CAT_EXP),
      fetchSeries(CAT_IMP),
    ])

    if (!gdp.length) throw new Error('No GDP data returned from e-Stat')

    // Align all series to GDP dates
    const align = (arr) => {
      const map = Object.fromEntries(arr.map(v => [v.date, v.value]))
      return gdp.map(v => ({ date: v.date, value: map[v.date] ?? null }))
    }
    const [consA, govtA, investA, expA, impA] = [cons, govt, invest, exp, imp].map(align)

    // QoQ contribution to GDP growth (pp)
    const contributions = gdp.slice(1).map((v, i) => {
      const prevGDP = gdp[i].value
      const contrib = (arr) => {
        const cv = arr[i+1]?.value, pv = arr[i]?.value
        return (cv != null && pv != null) ? parseFloat(((cv - pv) / prevGDP * 100).toFixed(3)) : null
      }
      const ev = expA[i+1]?.value, ep = expA[i]?.value
      const mv = impA[i+1]?.value, mp = impA[i]?.value
      const net_exp = (ev!=null&&ep!=null&&mv!=null&&mp!=null)
        ? parseFloat((((ev-ep)-(mv-mp))/prevGDP*100).toFixed(3)) : null
      return {
        date: v.date,
        cons: contrib(consA), govt: contrib(govtA),
        invest: contrib(investA), net_exp,
        gdp_qoq: parseFloat(((v.value-gdp[i].value)/gdp[i].value*100).toFixed(2))
      }
    }).filter(v => v.cons !== null)

    return Response.json({
      gdp_qoq:       qoq(gdp).slice(-16),
      gdp_yoy:       yoy(gdp).slice(-16),
      gdp_levels:    gdp.slice(-16),
      contributions: contributions.slice(-12),
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
