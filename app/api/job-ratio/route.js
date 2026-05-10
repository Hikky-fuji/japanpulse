export const dynamic = 'force-dynamic'

const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'
// 景気動向指数（内閣府）— 月次 SA, 一致系列
// cat01=2090: 有効求人倍率（除学卒）SA
// cat01=1030: 新規求人数（除学卒）leading
const CI_STATS_ID = '0003446462'

// 労働力調査（総務省） — 完全失業率 SA for dual-axis
const LF_STATS_ID  = '0003005865'
const LF_UR_CAT02  = '08'
const LF_UR_TAB    = '02'

const isMonthly = v => {
  const t = v['@time']
  return t?.length === 10 && t.slice(4, 6) === '00' &&
    parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
}
const fmt = t => `${t.slice(0, 4)}/${t.slice(6, 8)}`
const toArr = x => (Array.isArray(x) ? x : x ? [x] : [])

async function fetchCI(cat01, limit = 9999) {
  const APP_ID = process.env.ESTAT_APP_ID
  const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${CI_STATS_ID}`
    + `&metaGetFlg=N&cdCat01=${cat01}&limit=${limit}`
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  return toArr(json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE)
    .filter(isMonthly)
    .map(v => ({ date: fmt(v['@time']), value: parseFloat(v['$']) }))
    .filter(v => !isNaN(v.value))
    .sort((a, b) => a.date.localeCompare(b.date))
}

async function fetchUnemploymentRate() {
  const APP_ID = process.env.ESTAT_APP_ID
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
    + `?appId=${APP_ID}&statsDataId=${LF_STATS_ID}`
    + `&metaGetFlg=N&limit=400&cdArea=00000&cdCat01=000&cdCat02=${LF_UR_CAT02}&cdCat03=0&cdTab=${LF_UR_TAB}`
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  return toArr(json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE)
    .filter(isMonthly)
    .map(v => ({ date: fmt(v['@time']), value: parseFloat(v['$']) }))
    .filter(v => !isNaN(v.value))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function calcYoY(series) {
  const map = Object.fromEntries(series.map(d => [d.date, d.value]))
  return series.map(d => {
    const [y, m] = d.date.split('/')
    const prior = `${parseInt(y) - 1}/${m}`
    if (map[prior] != null) return { date: d.date, yoy: parseFloat(((d.value - map[prior]) / map[prior] * 100).toFixed(2)) }
    return null
  }).filter(Boolean)
}

export async function GET() {
  try {
    const [ratioAll, newJobsAll, urAll] = await Promise.all([
      fetchCI('2090'),           // 有効求人倍率（除学卒）SA — 一致系列C9
      fetchCI('1030').catch(() => { console.warn('[JobRatio] newJobs fetch failed'); return [] }),
      fetchUnemploymentRate().catch(() => { console.warn('[JobRatio] UR fetch failed'); return [] }),
    ])

    if (!ratioAll.length) {
      return Response.json({ error: 'No job ratio data returned' }, { status: 500 })
    }

    const ratio24 = ratioAll.slice(-24)
    const dates   = ratio24.map(d => d.date)

    const ratioMap    = Object.fromEntries(ratioAll.map(d => [d.date, d.value]))
    const newJobsMap  = Object.fromEntries(newJobsAll.map(d => [d.date, d.value]))
    const urMap       = Object.fromEntries(urAll.map(d => [d.date, d.value]))

    const ratioYoY    = calcYoY(ratioAll)
    const ratioYoYMap = Object.fromEntries(ratioYoY.map(d => [d.date, d.yoy]))
    const newJobsYoY  = calcYoY(newJobsAll)
    const newJobsYoYMap = Object.fromEntries(newJobsYoY.map(d => [d.date, d.yoy]))

    const latest = ratio24.at(-1)
    const prev   = ratio24.at(-2)

    const series = dates.map(date => ({
      date,
      ratio:       ratioMap[date]       ?? null,
      ratioYoY:    ratioYoYMap[date]    ?? null,
      newJobs:     newJobsMap[date]     ?? null,
      newJobsYoY:  newJobsYoYMap[date]  ?? null,
      ur:          urMap[date]          ?? null,
    }))

    return Response.json({
      latest: {
        date:      latest.date,
        ratio:     latest.value,
        ratioPrev: prev?.value ?? null,
        ratioDiff: prev?.value != null ? parseFloat((latest.value - prev.value).toFixed(2)) : null,
        ratioYoY:  ratioYoYMap[latest.date] ?? null,
      },
      series,
    })
  } catch (e) {
    console.error('[JobRatio]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
