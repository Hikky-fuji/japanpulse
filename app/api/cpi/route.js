import { JAPAN_CPI_BASE_YEAR, JAPAN_CPI_STATS_ID, JAPAN_CPI_WEIGHTS } from '../../lib/japan-cpi-config.mjs'

export const revalidate = 21600
export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  const fetchSeries = async (cat, tab = '3') => {
    const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
      + `?appId=${APP_ID}`
      + `&statsDataId=${JAPAN_CPI_STATS_ID}`
      + `&metaGetFlg=N&limit=100`
      + `&cdArea=00000`
      + `&cdCat01=${cat}`
      + `&cdTab=${tab}`

    const res = await fetch(url, { next: { revalidate } })
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

    const isMonthly = (v) => {
      const t = v['@time']
      if (!t || t.length !== 10) return false
      return t.slice(4, 6) === '00' && parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
    }

    const formatDate = (time) => time.slice(0, 4) + '/' + time.slice(6, 8)

    if (!values.length) console.warn(`[CPI] No data: cat=${cat} tab=${tab}`)

    return values
      .filter(isMonthly)
      .sort((a, b) => a['@time'].localeCompare(b['@time']))
      .slice(-24)
      .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))
  }

  const [
    headline, core, corecore, services,
    food_ex_fresh, energy, goods_ex_fresh,
    food, housing, utilities, medical, transport, transport_comms, education, comms, leisure, miscellaneous, eating_out, apparel, furniture,
    headline_mm, core_mm, corecore_mm, services_mm,
    food_mm, energy_mm, goods_mm, housing_mm, medical_mm,
    transport_mm, education_mm, comms_mm, leisure_mm, eating_out_mm, apparel_mm, furniture_mm
  ] = await Promise.all([
    fetchSeries('0001'),       // 総合
    fetchSeries('0161'),       // コア
    fetchSeries('0178'),       // コアコア
    fetchSeries('0242'),       // 持家の帰属家賃を除くサービス
    fetchSeries('0172'),       // 食料（生鮮除く）
    fetchSeries('0167'),       // エネルギー
    fetchSeries('0241'),       // 生鮮食品を除く財
    fetchSeries('0002'),       // 食料
    fetchSeries('0045'),       // 住居
    fetchSeries('0054'),       // 光熱・水道
    fetchSeries('0107'),       // 保健医療
    fetchSeries('0112'),       // 交通
    fetchSeries('0111'),       // 交通・通信
    fetchSeries('0118'),       // 教育
    fetchSeries('0117'),       // 通信
    fetchSeries('0122'),       // 教養娯楽
    fetchSeries('0145'),       // 諸雑費
    fetchSeries('0042'),       // 外食
    fetchSeries('0082'),       // 被服及び履物
    fetchSeries('0060'),       // 家具・家事用品
    fetchSeries('0001', '2'),  // 総合 M/M
    fetchSeries('0161', '2'),
    fetchSeries('0178', '2'),
    fetchSeries('0242', '2'),
    fetchSeries('0172', '2'),
    fetchSeries('0167', '2'),
    fetchSeries('0241', '2'),
    fetchSeries('0045', '2'),
    fetchSeries('0107', '2'),
    fetchSeries('0112', '2'),
    fetchSeries('0118', '2'),
    fetchSeries('0117', '2'),
    fetchSeries('0122', '2'),
    fetchSeries('0042', '2'),
    fetchSeries('0082', '2'),
    fetchSeries('0060', '2'),
  ])

  const calcContrib = (series, weight) =>
    series.map(v => ({ date: v.date, value: parseFloat((v.value * weight / 10000).toFixed(3)) }))

  const contrib = {
    food: calcContrib(food, JAPAN_CPI_WEIGHTS.food),
    housing: calcContrib(housing, JAPAN_CPI_WEIGHTS.housing),
    utilities: calcContrib(utilities, JAPAN_CPI_WEIGHTS.utilities),
    furniture: calcContrib(furniture, JAPAN_CPI_WEIGHTS.furniture),
    apparel: calcContrib(apparel, JAPAN_CPI_WEIGHTS.apparel),
    medical: calcContrib(medical, JAPAN_CPI_WEIGHTS.medical),
    transport_comms: calcContrib(transport_comms, JAPAN_CPI_WEIGHTS.transportComms),
    education: calcContrib(education, JAPAN_CPI_WEIGHTS.education),
    leisure: calcContrib(leisure, JAPAN_CPI_WEIGHTS.leisure),
    miscellaneous: calcContrib(miscellaneous, JAPAN_CPI_WEIGHTS.miscellaneous),
  }

  return Response.json({
    headline, core, corecore, services,
    food_ex_fresh, energy, goods_ex_fresh,
    food, housing, utilities, medical, transport, transport_comms, education, comms, leisure, miscellaneous, eating_out, apparel, furniture,
    headline_mm, core_mm, corecore_mm, services_mm,
    food_mm, energy_mm, goods_mm, housing_mm, medical_mm,
    transport_mm, education_mm, comms_mm, leisure_mm, eating_out_mm, apparel_mm, furniture_mm,
    contrib,
    metadata: { baseYear: JAPAN_CPI_BASE_YEAR, statsDataId: JAPAN_CPI_STATS_ID, weightUnit: 10000 },
  })
}
