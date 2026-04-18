export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  const fetchSeries = async (cat, tab = '3') => {
    const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData`
      + `?appId=${APP_ID}`
      + `&statsDataId=0003427113`
      + `&metaGetFlg=N&limit=100`
      + `&cdArea=13A01`
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

  const [headline, core, corecore, services] = await Promise.all([
    fetchSeries('0001'),
    fetchSeries('0161'),
    fetchSeries('0178'),
    fetchSeries('0220'),
  ])

  const [headline_mm, core_mm, corecore_mm, services_mm] = await Promise.all([
    fetchSeries('0001', '2'),
    fetchSeries('0161', '2'),
    fetchSeries('0178', '2'),
    fetchSeries('0220', '2'),
  ])

  return Response.json({ headline, core, corecore, services, headline_mm, core_mm, corecore_mm, services_mm })
}
