export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
    + `?appId=${APP_ID}`
    + `&statsDataId=0003427113`
    + `&metaGetFlg=N&limit=200`

  const res = await fetch(url, { next: { revalidate: 86400 } })
  const json = await res.json()
  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

  const formatDate = (time) =>
    time.slice(0, 4) + '/' + time.slice(4, 6)

  const parseVal = (cat, code) =>
    values
      .filter(v => v['@cat01'] === code)
      .slice(-24)
      .map(v => ({ date: formatDate(v['@time']), value: parseFloat(v['$']) }))

  // cat01コードを確認するため全カテゴリを返す
  const cats = [...new Set(values.map(v => v['@cat01']))]

  return Response.json({ cats, count: values.length, sample: values.slice(0, 3) })
}
