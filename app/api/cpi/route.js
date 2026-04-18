export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  const fetchSeries = async (cat, tab = '3') => {
    const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
      + `?appId=${APP_ID}`
      + `&statsDataId=0003427113`
      + `&metaGetFlg=N&limit=100`
      + `&cdArea=00000`
      + `&cdCat01=${cat}`
      + `&cdTab=${tab}`

    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

    const isMonthly = (v) => {
      const t = v['@time']
      if (!t || t.length !== 10) return false
      return t.slice(4, 6) === '00' && parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
    }

    const formatDate = (time) => time.slice(0, 4) + '/' + time.slice(6, 8)

    return values
      .filter(isMonthly)
      .sort((a, b) => a['@time'].localeCompare(b['@time']))
      .slice(-24)
      .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))
  }

  const [
    headline, core, corecore, services,
    food_ex_fresh, energy, goods_ex_food_energy,
    housing, medical, transport, education, comms, leisure, eating_out, apparel, furniture
  ] = await Promise.all([
    fetchSeries('0001'),  // 総合
    fetchSeries('0161'),  // コア
    fetchSeries('0178'),  // コアコア
    fetchSeries('0220'),  // サービス
    fetchSeries('0172'),  // 食料（生鮮除く）
    fetchSeries('0167'),  // エネルギー
    fetchSeries('0241'),  // 財（食料・エネ除く）
    fetchSeries('0045'),  // 住居
    fetchSeries('0107'),  // 保健医療
    fetchSeries('0112'),  // 交通
    fetchSeries('0118'),  // 教育
    fetchSeries('0117'),  // 通信
    fetchSeries('0122'),  // 教養娯楽
    fetchSeries('0042'),  // 外食
    fetchSeries('0082'),  // 被服及び履物
    fetchSeries('0060'),  // 家具・家事用品
  ])

  const [
    headline_mm, core_mm, corecore_mm, services_mm,
    food_mm, energy_mm, goods_mm, housing_mm, medical_mm,
    transport_mm, education_mm, comms_mm, leisure_mm, eating_out_mm, apparel_mm, furniture_mm
  ] = await Promise.all([
    fetchSeries('0001', '2'),
    fetchSeries('0161', '2'),
    fetchSeries('0178', '2'),
    fetchSeries('0220', '2'),
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
    series.map(v => ({ date: v.date, value: parseFloat((v.value * weight / 1000).toFixed(3)) }))

  const contrib = {
    food_ex_fresh:        calcContrib(food_ex_fresh, 219),
    energy:               calcContrib(energy, 72),
    goods_ex_food_energy: calcContrib(goods_ex_food_energy, 269),
    services:             calcContrib(services, 330),
  }

  return Response.json({
    headline, core, corecore, services,
    food_ex_fresh, energy, goods_ex_food_energy,
    housing, medical, transport, education, comms, leisure, eating_out, apparel, furniture,
    headline_mm, core_mm, corecore_mm, services_mm,
    food_mm, energy_mm, goods_mm, housing_mm, medical_mm,
    transport_mm, education_mm, comms_mm, leisure_mm, eating_out_mm, apparel_mm, furniture_mm,
    contrib
  })
}
