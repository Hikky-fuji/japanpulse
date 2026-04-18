export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  const fetch_series = async (statsDataId) => {
    const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
      + `?appId=${APP_ID}`
      + `&statsDataId=${statsDataId}`
      + `&metaGetFlg=N&limit=36`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const json = await res.json()
    const values = json?.GET_STATS_DATA
      ?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

    return values
      .filter(v => v['@time'] && v['$'])
      .slice(-24)
      .map(v => ({
        date: v['@time'].slice(0, 4) + '/' + v['@time'].slice(4, 6),
        value: parseFloat(v['$'])
      }))
  }

  // 総合CPI・コア（生鮮食品を除く）・コアコア（食料・エネルギーを除く）
  // statsDataIdはe-Statの消費者物価指数から取得
  const [headline, core, corecore] = await Promise.all([
    fetch_series('0003427113'),  // 総合
    fetch_series('0003427061'),  // コア（生鮮除く）
    fetch_series('0003427062'),  // コアコア（食料・エネルギー除く）
  ])

  return Response.json({ headline, core, corecore })
}
