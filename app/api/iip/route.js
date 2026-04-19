export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsList`
    + `?appId=${APP_ID}`
    + `&toukei=00550300`
    + `&tstat=000001022877`
    + `&cycle=1`
    + `&limit=30`

  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const tables = json?.GET_STATS_LIST?.DATALIST_INF?.TABLE_INF ?? []

  return Response.json({
    count: tables.length,
    sample: tables.slice(0, 5).map(t => ({
      id: t['@id'],
      title: t.TITLE,
      date: t.SURVEY_DATE,
      updated: t.UPDATED_DATE,
    }))
  })
}
