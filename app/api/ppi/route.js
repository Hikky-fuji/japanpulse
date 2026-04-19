export const dynamic = 'force-dynamic'

export async function GET() {
  const BASE = 'https://www.stat-search.boj.or.jp/api/v1/getDataCode'
  const start = '202101'

  const fetchBOJ = async (db, codes) => {
    const url = `${BASE}?format=json&lang=jp&db=${db}&code=${codes.join(',')}&startDate=${start}`
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    return json?.DATA?.SERIES ?? []
  }

  const parseSeriesJson = (series) => {
    if (!series) return []
    const dates = series.SURVEY_DATES ?? []
    const values = series.VALUES ?? []
    return dates
      .map((d, i) => ({
        date: d.slice(0, 4) + '/' + d.slice(4, 6),
        value: values[i] != null ? parseFloat(values[i]) : null
      }))
      .filter(d => d.value != null)
      .slice(-36)
  }

  try {
    // CGPI: 国内企業物価
    const cgpiSeries = await fetchBOJ('PR01', [
      'PRCG20_2200000000',  // 国内企業物価 総平均
      'PRCG20_2200310001',  // 石油・石炭製品
      'PRCG20_2200410001',  // 電子部品・デバイス
      'PRCG20_2200510001',  // 電力・都市ガス・水道
    ])

    // 輸入・輸出物価
    const tradeSeries = await fetchBOJ('PR01', [
      'PRIF20_2600000000',  // 輸入物価 円ベース 総平均
      'PREF20_2700000000',  // 輸出物価 円ベース 総平均
    ])

    // SPPI: 企業向けサービス価格
    const sppiSeries = await fetchBOJ('PR02', [
      'PRCS20_2000000000',  // SPPI 総平均
    ])

    const result = {
      cgpi:   parseSeriesJson(cgpiSeries[0]),
      import: parseSeriesJson(tradeSeries[0]),
      export: parseSeriesJson(tradeSeries[1]),
      sppi:   parseSeriesJson(sppiSeries[0]),
      // デバッグ用
      _raw: { cgpi: cgpiSeries[0]?.SERIES_CODE }
    }

    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
