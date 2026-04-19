export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
    + `?appId=${APP_ID}`
    + `&statsDataId=0004023601`
    + `&metaGetFlg=N&limit=10`

  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
  const cats = [...new Set(values.map(v => v['@cat01']))]
  const tabs = [...new Set(values.map(v => v['@tab']))]

  return Response.json({ cats, tabs, count: values.length, sample: values.slice(0, 3) })
}
