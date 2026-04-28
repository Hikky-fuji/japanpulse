export const dynamic = 'force-dynamic'

const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'
const STATS_ID = '0003348423' // 季節調整値 全国の分野・業種別DIの推移

export async function GET(request) {
  const APP_ID = process.env.ESTAT_APP_ID
  const debug = new URL(request.url).searchParams.has('debug')

  try {
    const [metaRes, dataRes] = await Promise.all([
      fetch(`${BASE}/getMetaInfo?appId=${APP_ID}&statsDataId=${STATS_ID}`, { cache: 'no-store' }),
      fetch(`${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${STATS_ID}&metaGetFlg=N&limit=9999`, { cache: 'no-store' }),
    ])

    const metaJson = await metaRes.json()
    const dataJson = await dataRes.json()

    const classObjs = metaJson?.GET_META_INFO?.METADATA_INF?.CLASS_INF?.CLASS_OBJ ?? []
    if (!classObjs.length) throw new Error('Metadata unavailable for Economy Watchers dataset')

    const classMaps = {}
    for (const obj of classObjs) {
      const id = obj['@id']
      const classes = Array.isArray(obj.CLASS) ? obj.CLASS : [obj.CLASS]
      classMaps[id] = Object.fromEntries(classes.map(c => [c['@code'], c['@name'] ?? '']))
    }
    const classIds = Object.keys(classMaps)

    const rawValues = dataJson?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

    const isMonthly = (v) => {
      const t = v['@time']
      return t?.length === 10 && t.slice(4, 6) === '00' &&
             parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
    }
    const formatDate = (t) => `${t.slice(0, 4)}/${t.slice(6, 8)}`

    const values = rawValues.filter(isMonthly)

    const rowLabel = (v) => classIds.map(id => classMaps[id]?.[v[`@${id}`]] ?? '').join('|')

    // Deduplicate by date: keep last occurrence (revised value overwrites preliminary)
    const dedup = (arr) => {
      const map = new Map()
      arr.forEach(v => map.set(v.date, v))
      return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
    }

    const matchSeries = (...keywords) => dedup(
      values
        .filter(v => { const lbl = rowLabel(v); return keywords.every(kw => lbl.includes(kw)) })
        .sort((a, b) => a['@time'].localeCompare(b['@time']))
        .slice(-60)
        .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))
        .filter(v => !isNaN(v.value))
    )

    const uniqueLabels = [...new Set(values.map(rowLabel))].slice(0, 40)
    console.log('[WATCHER] uniqueLabels:', JSON.stringify(uniqueLabels))

    // Try multiple keyword patterns for each sector
    const current_all  = matchSeries('現状判断', '合計')
    const outlook_all  = matchSeries('先行き判断', '合計')
    // Try both full and partial names for sectors
    const current_hh   = matchSeries('現状判断', '家計動向').length
                          ? matchSeries('現状判断', '家計動向')
                          : matchSeries('現状判断', '家計')
    const current_corp = matchSeries('現状判断', '企業動向').length
                          ? matchSeries('現状判断', '企業動向')
                          : matchSeries('現状判断', '企業')
    const current_emp  = matchSeries('現状判断', '雇用関連').length
                          ? matchSeries('現状判断', '雇用関連')
                          : matchSeries('現状判断', '雇用')

    if (!current_all.length) {
      return Response.json({
        error: 'Could not match Economy Watchers series — check debug info',
        debug: { uniqueLabels, totalValues: rawValues.length, monthlyValues: values.length }
      }, { status: 500 })
    }

    const payload = { current_all, outlook_all, current_hh, current_corp, current_emp }
    if (debug) payload._debug = { uniqueLabels }
    return Response.json(payload)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
