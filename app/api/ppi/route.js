export const dynamic = 'force-dynamic'

export async function GET() {
  const BASE = 'https://www.stat-search.boj.or.jp/api/v1/getDataCode'
  const start = '202201'

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
      .slice(-48)
  }

  try {
    const [cgpiRes, tradeRes, sppiRes] = await Promise.all([
      fetchBOJ('PR01', [
        'PRCG20_2200000000',  // 国内企業物価 総平均
        'PRCG20_2600000000',  // 輸入物価 円ベース 総平均
        'PRCG20_2400000000',  // 輸出物価 円ベース 総平均
      ]),
      fetchBOJ('PR01', [
        'PRCG20_2200620001',  // 石油・石炭製品
        'PRCG20_2201520001',  // 電子部品・デバイス
        'PRCG20_2202220001',  // 電力・都市ガス・水道
      ]),
      fetchBOJ('PR02', [
        'PRCS20_5200000000',  // SPPI 総平均
      ]),
    ])

    return Response.json({
      cgpi:       parseSeries(cgpiRes[0]),
      import_ppi: parseSeries(cgpiRes[1]),
      export_ppi: parseSeries(cgpiRes[2]),
      cgpi_oil:   parseSeries(tradeRes[0]),
      cgpi_elec:  parseSeries(tradeRes[1]),
      cgpi_energy: parseSeries(tradeRes[2]),
      sppi:       parseSeries(sppiRes[0]),
    })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
