export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID
  const LATEST_ID = process.env.ESTAT_IIP_LATEST_ID
  const PREV_ID = process.env.ESTAT_IIP_PREV_ID

  const fetchFile = async (statInfId) => {
    const url = `https://www.e-stat.go.jp/stat-search/file-download?statInfId=${statInfId}&fileKind=0`
    const res = await fetch(url, { cache: 'no-store' })
    const arrayBuffer = await res.arrayBuffer()
    return arrayBuffer
  }

  const parseSheet = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName]
    if (!ws) return []
    const rows = []
    let r = 9 // データ行開始（0-indexed row8から）
    while (true) {
      const cell = ws[`A${r}`]
      if (!cell) break
      const tc = String(cell.v || '')
      if (tc.length === 10 && tc.startsWith('20')) {
        const isMonthly = tc.slice(4,6) === '00' && tc.slice(6,8) !== '00' && tc.slice(6,8) === tc.slice(8,10)
        if (isMonthly) {
          const date = tc.slice(0,4) + '/' + tc.slice(6,8)
          const get = (col) => {
            const c = ws[`${col}${r}`]
            return c && typeof c.v === 'number' ? c.v : null
          }
          rows.push({
            date,
            prod_sa:   get('B'), prod_mom:  get('C'),
            prod_idx:  get('D'), prod_yoy:  get('E'),
            ship_sa:   get('F'), ship_mom:  get('G'),
            inv_sa:    get('J'), inv_mom:   get('K'),
            invr_sa:   get('N'), invr_mom:  get('O'),
          })
        }
      }
      r++
    }
    return rows
  }

  try {
    const XLSX = await import('xlsx')

    const [latestBuf, prevBuf] = await Promise.all([
      fetchFile(LATEST_ID),
      fetchFile(PREV_ID),
    ])

    const wbLatest = XLSX.read(latestBuf, { type: 'array' })
    const wbPrev   = XLSX.read(prevBuf,   { type: 'array' })

    const sheets = [
      '鉱工業',
      '輸送機械工業', '自動車工業',
      '電子部品・デバイス工業', '電気・情報通信機械工業',
      '生産用機械工業', '化学工業（除．医薬品）',
      '資本財', '耐久消費財', '非耐久消費財', '生産財',
    ]

    const result = {}
    for (const sheet of sheets) {
      const prev   = parseSheet(wbPrev,   sheet)
      const latest = parseSheet(wbLatest, sheet)
      // 確報優先でマージ（同じ月は確報を使う）
      const map = {}
      prev.forEach(d => { map[d.date] = d })
      latest.forEach(d => {
        if (!map[d.date]) map[d.date] = d // 速報は確報にない月だけ追加
      })
      result[sheet] = Object.values(map)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-24)
    }

    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
