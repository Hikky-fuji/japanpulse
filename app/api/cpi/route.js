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

  const [headline, core, corecore, services, headline_mm, core_mm, corecore_mm, services_mm] = await Promise.all([
    fetchSeries('0001'),   // 総合 Y/Y
    fetchSeries('0161'),   // コア Y/Y
    fetchSeries('0178'),   // コアコア Y/Y
    fetchSeries('0220'),   // サービス Y/Y
    fetchSeries('0001', '2'),  // 総合 M/M
    fetchSeries('0161', '2'),  // コア M/M
    fetchSeries('0178', '2'),  // コアコア M/M
    fetchSeries('0220', '2'),  // サービス M/M
  ])

  return Response.json({ headline, core, corecore, services, headline_mm, core_mm, corecore_mm, services_mm })
}
