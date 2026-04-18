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
      const mid = t.slice(4, 6)
      const month = parseInt(t.slice(6, 8))
      return mid === '00' && month >= 1 && month <= 12
    }

    const formatDate = (time) => time.slice(0, 4) + '/' + time.slice(6, 8)

    return values
      .filter(isMonthly)
      .sort((a, b) => a['@time'].localeCompare(b['@time']))
      .slice(-24)
      .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))
  }

  // Y/Y系列
  const [headline, core, corecore, services,
         food_ex_fresh, energy, goods_ex_food_energy,
         housing, medical, transport, education, comms] = await Promise.all([
    fetchSeries('0001'),  // 総合
    fetchSeries('0161'),  // コア（生鮮除く）
    fetchSeries('0178'),  // コアコア（食料・エネ除く）
    fetchSeries('0220'),  // サービス
    fetchSeries('0172'),  // 食料（生鮮除く）
    fetchSeries('0167'),  // エネルギー
    fetchSeries('0241'),  // 生鮮食品を除く財
    fetchSeries('0045'),  // 住居
    fetchSeries('0107'),  // 保健医療
    fetchSeries('0111'),  // 交通・通信
    fetchSeries('0118'),  // 教育
    fetchSeries('0117'),  // 通信
  ])

  // M/M系列（重要品目）
  const [headline_mm, core_mm, corecore_mm, services_mm,
         food_mm, energy_mm, goods_mm, housing_mm, medical_mm, transport_mm] = await Promise.all([
    fetchSeries('0001', '2'),
    fetchSeries('0161', '2'),
    fetchSeries('0178', '2'),
    fetchSeries('0220', '2'),
    fetchSeries('0172', '2'),
    fetchSeries('0167', '2'),
    fetchSeries('0241', '2'),
    fetchSeries('0045', '2'),
    fetchSeries('0107', '2'),
    fetchSeries('0111', '2'),
  ])

  // 寄与度計算用ウェート（2020年基準、総合1000分比）
  const weights = {
    food_ex_fresh:        219,
    energy:                72,
    goods_ex_food_energy: 269,
    services_ex_rent:     330,
    imputed_rent:         110,
  }

  // 寄与度 = Y/Y × weight / 1000
  const calcContrib = (series, weight) =>
    series.map(v => ({ date: v.date, value: parseFloat((v.value * weight / 1000).toFixed(3)) }))

  const contrib = {
    food_ex_fresh:        calcContrib(food_ex_fresh, weights.food_ex_fresh),
    energy:               calcContrib(energy, weights.energy),
    goods_ex_food_energy: calcContrib(goods_ex_food_energy, weights.goods_ex_food_energy),
    services:             calcContrib(services, weights.services_ex_rent),
  }

  return Response.json({
    headline, core, corecore, services,
    food_ex_fresh, energy, goods_ex_food_energy,
    housing, medical, transport, education, comms,
    headline_mm, core_mm, corecore_mm, services_mm,
    food_mm, energy_mm, goods_mm, housing_mm, medical_mm, transport_mm,
    contrib
  })
}
