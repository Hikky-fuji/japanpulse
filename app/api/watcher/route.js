export const dynamic = 'force-dynamic'

const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'
const STATS_ID = '0003348423'

// cat01=100: 現状判断SA, cat01=110: 先行き判断SA
// cat02 sectors: 100=合計, 110=家計動向, 590=企業動向, 940=雇用

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  const fetchByCat01 = async (cat01) => {
    const url = `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${STATS_ID}`
      + `&metaGetFlg=N&limit=9999&cdTab=140&cdCat01=${cat01}`
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    return json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
  }

  try {
    const [currentValues, outlookValues] = await Promise.all([
      fetchByCat01('100'),
      fetchByCat01('110'),
    ])

    const isMonthly = (v) => {
      const t = v['@time']
      return t?.length === 10 && t.slice(4, 6) === '00' &&
             parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
    }
    const formatDate = (t) => `${t.slice(0, 4)}/${t.slice(6, 8)}`

    const dedup = (arr) => {
      const map = new Map()
      arr.forEach(v => map.set(v.date, v))
      return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
    }

    const toSeries = (rows, cat2) => dedup(
      rows
        .filter(v => v['@cat02'] === cat2 && isMonthly(v))
        .sort((a, b) => a['@time'].localeCompare(b['@time']))
        .slice(-60)
        .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))
        .filter(v => !isNaN(v.value))
    )

    const current_all  = toSeries(currentValues, '100')
    const current_hh   = toSeries(currentValues, '110')
    const current_corp = toSeries(currentValues, '590')
    const current_emp  = toSeries(currentValues, '940')
    const outlook_all  = toSeries(outlookValues, '100')
    const outlook_hh   = toSeries(outlookValues, '110')
    const outlook_corp = toSeries(outlookValues, '590')
    const outlook_emp  = toSeries(outlookValues, '940')

    if (!current_all.length) {
      return Response.json({ error: 'No data for Economy Watchers SA series' }, { status: 500 })
    }

    return Response.json({
      current_all, outlook_all,
      current_hh, current_corp, current_emp,
      outlook_hh, outlook_corp, outlook_emp,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
