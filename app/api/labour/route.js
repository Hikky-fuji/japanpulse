export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID    = process.env.ESTAT_APP_ID
  const RATES_ID  = '0003005865'  // 完全失業率・就業率・労働力人口比率（月次、%）
  const COUNTS_ID = '0003005798'  // 就業者・失業者・非労働力人口（月次、万人）

  const isMonthly = (v) => {
    const t = v['@time']
    if (!t || t.length !== 10) return false
    return t.slice(4, 6) === '00' && parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
  }

  const formatDate = (time) => time.slice(0, 4) + '/' + time.slice(6, 8)

  const fetchSeries = async (statsDataId, cat02, tab) => {
    const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
      + `?appId=${APP_ID}`
      + `&statsDataId=${statsDataId}`
      + `&metaGetFlg=N&limit=400`
      + `&cdArea=00000`
      + `&cdCat01=000`
      + `&cdCat02=${cat02}`
      + `&cdCat03=0`
      + `&cdTab=${tab}`

    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

    if (!values.length) console.warn(`[Labour] No data: ${statsDataId} cat02=${cat02} tab=${tab}`)

    return values
      .filter(isMonthly)
      .sort((a, b) => a['@time'].localeCompare(b['@time']))
      .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))
  }

  // CPI コア前年比（フィリップス曲線用）— statsDataId=0003427113 cat01=0161 tab=3
  const fetchCpiCore = async () => {
    const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
      + `?appId=${APP_ID}`
      + `&statsDataId=0003427113`
      + `&metaGetFlg=N&limit=1000`
      + `&cdArea=00000`
      + `&cdCat01=0161`
      + `&cdTab=3`

    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
    return values
      .filter(isMonthly)
      .sort((a, b) => a['@time'].localeCompare(b['@time']))
      .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))
  }

  const [urAll, prAll, empAll, uempAll, nilfAll, cpiCoreAll] = await Promise.all([
    fetchSeries(RATES_ID,  '08', '02'),  // 完全失業率 (%)
    fetchSeries(RATES_ID,  '01', '02'),  // 労働力人口比率 (%)
    fetchSeries(COUNTS_ID, '02', '01'),  // 就業者数 (万人)
    fetchSeries(COUNTS_ID, '08', '01'),  // 完全失業者数 (万人)
    fetchSeries(COUNTS_ID, '09', '01'),  // 非労働力人口 (万人)
    fetchCpiCore(),                       // コアCPI前年比（散布図用）
  ])

  const getPriorDate = (date) => {
    const [y, m] = date.split('/').map(Number)
    return `${y - 1}/${String(m).padStart(2, '0')}`
  }

  const makeMap = (arr) => Object.fromEntries(arr.map(d => [d.date, d.value]))

  const urMap   = makeMap(urAll)
  const prMap   = makeMap(prAll)
  const empMap  = makeMap(empAll)
  const uempMap = makeMap(uempAll)
  const nilfMap = makeMap(nilfAll)

  const empYoYMap = {}
  empAll.forEach(d => {
    const prior = empMap[getPriorDate(d.date)]
    if (prior != null) {
      empYoYMap[d.date] = parseFloat(((d.value - prior) / prior * 100).toFixed(2))
    }
  })

  const dates = urAll.slice(-24).map(d => d.date)

  const result = dates.map(date => ({
    date,
    unemploymentRate:  urMap[date]   ?? null,
    participationRate: prMap[date]   ?? null,
    employed:          empMap[date]  ?? null,
    unemployed:        uempMap[date] ?? null,
    notInLaborForce:   nilfMap[date] ?? null,
    employedYoY:       empYoYMap[date] ?? null,
  }))

  // フィリップス曲線用: 失業率とコアCPIが両方揃う全期間
  const cpiCoreMap = makeMap(cpiCoreAll)
  const scatter = urAll
    .filter(d => cpiCoreMap[d.date] != null)
    .map(d => ({ date: d.date, unemploymentRate: d.value, cpiCore: cpiCoreMap[d.date] }))

  return Response.json({ data: result, scatter })
}
