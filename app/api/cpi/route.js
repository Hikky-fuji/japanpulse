export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
    + `?appId=${APP_ID}`
    + `&statsDataId=0003427113`
    + `&metaGetFlg=N`
    + `&limit=100`
    + `&cdArea=00000`
    + `&cdCat01=0001`
    + `&cdTab=3`

  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

  const formatDate = (time) =>
    time.slice(0, 4) + '/' + time.slice(6, 8)

  const isMonthly = (v) => {
    const t = v['@time']
    if (!t || t.length !== 10) return false
    const mid = t.slice(4, 6)
    const month = parseInt(t.slice(6, 8))
    return mid === '00' && month >= 1 && month <= 12
  }

  const headline = values
    .filter(isMonthly)
    .sort((a, b) => a['@time'].localeCompare(b['@time']))
    .slice(-24)
    .map(v => ({
      date: formatDate(v['@time']),
      value: parseFloat(v['$'])
    }))

  return Response.json({ headline })
}
