export const dynamic = 'force-dynamic'

const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'
const STATS_ID = '0003348425'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  try {
    // Fetch metadata to discover category code structure
    const metaRes = await fetch(
      `${BASE}/getMetaInfo?appId=${APP_ID}&statsDataId=${STATS_ID}`,
      { cache: 'no-store' }
    )
    const metaJson = await metaRes.json()
    const classObjs = metaJson?.GET_META_INFO?.METADATA_INF?.CLASS_INF?.CLASS_OBJ ?? []

    if (!classObjs.length) throw new Error('Metadata unavailable for Economy Watchers dataset')

    // Build code->label maps per classification dimension
    const classMaps = {}
    for (const obj of classObjs) {
      const id = obj['@id']
      const classes = Array.isArray(obj.CLASS) ? obj.CLASS : [obj.CLASS]
      classMaps[id] = Object.fromEntries(classes.map(c => [c['@code'], c['@name'] ?? '']))
    }
    const classIds = Object.keys(classMaps)

    // Fetch all data records
    const dataRes = await fetch(
      `${BASE}/getStatsData?appId=${APP_ID}&statsDataId=${STATS_ID}&metaGetFlg=N&limit=9999`,
      { cache: 'no-store' }
    )
    const dataJson = await dataRes.json()
    const rawValues = dataJson?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

    // Keep only monthly observations (time format: YYYY00MM00)
    const isMonthly = (v) => {
      const t = v['@time']
      return t?.length === 10 && t.slice(4, 6) === '00' &&
             parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
    }
    const formatDate = (t) => `${t.slice(0, 4)}/${t.slice(6, 8)}`

    const values = rawValues.filter(isMonthly)

    // Concatenate all category labels for a row
    const rowLabel = (v) =>
      classIds.map(id => classMaps[id]?.[v[`@${id}`]] ?? '').join('|')

    // Extract a series matching all keyword patterns
    const matchSeries = (...keywords) =>
      values
        .filter(v => {
          const lbl = rowLabel(v)
          return keywords.every(kw => lbl.includes(kw))
        })
        .sort((a, b) => a['@time'].localeCompare(b['@time']))
        .slice(-24)
        .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))
        .filter(v => !isNaN(v.value))

    const current_all  = matchSeries('現状判断', '全国', '合計')
    const outlook_all  = matchSeries('先行き判断', '全国', '合計')
    const current_hh   = matchSeries('現状判断', '全国', '家計')
    const current_corp = matchSeries('現状判断', '全国', '企業')
    const current_emp  = matchSeries('現状判断', '全国', '雇用')

    if (!current_all.length) {
      const sampleLabels = values.slice(0, 5).map(rowLabel)
      return Response.json({
        error: 'Could not match Economy Watchers series — check debug info',
        debug: { sampleLabels, totalValues: rawValues.length, monthlyValues: values.length }
      }, { status: 500 })
    }

    return Response.json({ current_all, outlook_all, current_hh, current_corp, current_emp })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
