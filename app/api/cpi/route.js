export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  const ids = {
    headline: '0003427113',
    core:     '0003427114',
    corecore: '0003427115',
  }

  const fetch_series = async (statsDataId) => {
    const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
      + `?appId=${APP_ID}`
      + `&statsDataId=${statsDataId}`
      + `&metaGetFlg=N&limit=36`
    const res  = await fetch(url, { next: { revalidate: 86400 } })
    const json = await res.json()
    const values = json?.GET_STATS_DATA
      ?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
    return values.slice(-24).map(v => ({
      date:  v['@time'].slice(0, 6),
      value: parseFloat(v['$'])
    }))
  }

  const [headline, core, corecore] = await Promise.all([
    fetch_series(ids.headline),
    fetch_series(ids.core),
    fetch_series(ids.corecore),
  ])

  return Response.json({ headline, core, corecore })
}
