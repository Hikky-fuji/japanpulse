export const dynamic = 'force-dynamic'

export async function GET() {
  const BASE = 'https://www.stat-search.boj.or.jp/api/v1/getDataCode'
  const start = '202101'

  const fetchBOJ = async (db, codes) => {
    const url = `${BASE}?format=json&lang=jp&db=${db}&code=${codes.join(',')}&startDate=${start}`
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    return json?.RESULTSET ?? []
  }

  const parseSeries = (s) => {
    if (!s?.VALUES) return []
    const dates = s.VALUES.SURVEY_DATES ?? []
    const vals  = s.VALUES.VALUES ?? []
    return dates
      .map((d, i) => ({
        date:  String(d).slice(0,4) + '/' + String(d).slice(4,6),
        value: vals[i] != null ? parseFloat(vals[i]) : null
      }))
      .filter(d => d.value != null)
      .slice(-36)
  }

  try {
    const [cgpiRes, tradeRes, sppiRes] = await Promise.all([
      fetchBOJ('PR01', [
        'PRCG20_2200000000',
        'PRCG20_2200310001',
        'PRCG20_2200410001',
        'PRCG20_2200510001',
      ]),
      fetchBOJ('PR01', [
        'PRIF20_2600000000',
        'PREF20_2700000000',
      ]),
      fetchBOJ('PR02', [
        'PRCS20_2000000000',
      ]),
    ])

    return Response.json({
      cgpi:          parseSeries(cgpiRes[0]),
      cgpi_oil:      parseSeries(cgpiRes[1]),
      cgpi_electric: parseSeries(cgpiRes[2]),
      cgpi_energy:   parseSeries(cgpiRes[3]),
      import_ppi:    parseSeries(tradeRes[0]),
      export_ppi:    parseSeries(tradeRes[1]),
      sppi:          parseSeries(sppiRes[0]),
    })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
