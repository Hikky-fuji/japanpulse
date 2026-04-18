export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
    + `?appId=${APP_ID}`
    + `&statsDataId=0003427113`
    + `&metaGetFlg=N&limit=200`
    + `&cdArea=00000`
    + `&cdCat01=0001`

  const res = await fetch(url, { next: { revalidate: 86400 } })
  const json = await res.json()
  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

  const isMonthly = (v) => {
    const t = v['@time']
    return t && t.length === 10 && t.slice(6, 8) !== '00'
  }

  const formatDate = (time) =>
    time.slice(0, 4) + '/' + time.slice(4, 6)

  const headline = values
    .filter(isMonthly)
    .slice(-24)
    .map(v => ({
      date: formatDate(v['@time']),
      value: parseFloat(v['$'])
    }))

  return Response.json({ headline })
}
