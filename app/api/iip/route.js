export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID
  const LATEST_ID = process.env.ESTAT_IIP_LATEST_ID
  const PREV_ID = process.env.ESTAT_IIP_PREV_ID

  const fetchAndParse = async (statInfId) => {
    const url = `https://www.e-stat.go.jp/stat-search/file-download?statInfId=${statInfId}&fileKind=0`
    const res = await fetch(url, { cache: 'no-store' })
    const buf = await res.arrayBuffer()
    const XLSX = await import('xlsx')
    return XLSX.read(buf, { type: 'array' })
  }

  const parseSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName]
    if (!ws) return []
    const results = []
    for (let r = 1; r <= 200; r++) {
      const cellA = ws[`A${r}`]
      if (!cellA) continue
      const tc = String(cellA.v || '')
      if (tc.length !== 10 || !tc.startsWith('20')) continue
      const m1 = tc.slice(6, 8)
      const m2 = tc.slice(8, 10)
      const m = parseInt(m1)
      if (m1 !== m2 || m < 1 || m > 12) continue
      const date = tc.slice(0, 4) + '/' + m1
      const get = (col) => {
        const c = ws[`${col}${r}`]
        return c && typeof c.v === 'number' ? c.v : null
      }
      results.push({
        date,
        prod_sa:  get('B'), prod_mom: get('C'), prod_yoy: get('E'),
        ship_sa:  get('F'), ship_mom: get('G'), ship_yoy: get('I'),
        inv_sa:   get('J'), inv_mom:  get('K'), inv_yoy:  get('M'),
        invr_sa:  get('N'), invr_mom: get('O'),
      })
    }
    return results
  }

  // 予測指数パース（最新ファイルのみ）
  const parseForecast = (wb) => {
    const ws = wb.Sheets['予測指数_業種別']
    if (!ws) return []
    const results = []
    for (let r = 1; r <= 100; r++) {
      const cellA = ws[`A${r}`]
      if (!cellA) continue
      const tc = String(cellA.v || '')
      if (tc.length !== 10 || !tc.startsWith('20')) continue
      const m1 = tc.slice(6, 8)
      const m2 = tc.slice(8, 10)
      const m = parseInt(m1)
      if (m1 !== m2 || m < 1 || m > 12) continue
      const date = tc.slice(0, 4) + '/' + m1
      const get = (col) => {
        const c = ws[`${col}${r}`]
        return c && typeof c.v === 'number' ? c.v : null
      }
      // 製造工業のみ（B列が製造工業）
      const sector = ws[`B${r}`]?.v
      if (sector !== '製造工業') continue
      results.push({
        date,
        actual:    get('E'), // 前月実績
        current:   get('F'), // 当月見込み
        next:      get('G'), // 翌月見込み
        mom_actual: get('H'), // 前月比実績
      })
    }
    return results.slice(-12)
  }

  const sheets = [
    '鉱工業',
    '輸送機械工業', '自動車工業',
    '電子部品・デバイス工業', '電気・情報通信機械工業',
    '生産用機械工業', '化学工業（除．医薬品）',
    '資本財', '耐久消費財', '非耐久消費財', '生産財',
  ]

  try {
    const [wbLatest, wbPrev] = await Promise.all([
      fetchAndParse(LATEST_ID),
      fetchAndParse(PREV_ID),
    ])

    const result = {}
    for (const sheet of sheets) {
      const prev   = parseSheet(wbPrev,   sheet)
      const latest = parseSheet(wbLatest, sheet)
      const map = {}
      prev.forEach(d => { map[d.date] = d })
      latest.forEach(d => {
        if (!map[d.date]) map[d.date] = { ...d, is_flash: true }
      })
      result[sheet] = Object.values(map)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-24)
    }

    // 予測指数
    result['forecast'] = parseForecast(wbLatest)

    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
