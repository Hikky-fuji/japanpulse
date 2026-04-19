export const dynamic = 'force-dynamic'

export async function GET() {
  const url = 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000031771318&fileKind=1'
  
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const buffer = await res.arrayBuffer()
    const text = new TextDecoder('shift-jis').decode(buffer)
    
    // CSVをパース
    const lines = text.trim().split('\r\n').filter(l => l.trim())
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
    
    // データ行：201601以降の月次、TL（全産業）のみ
    const rows = lines.slice(1).filter(l => {
      const cols = l.split(',')
      return cols[1] && /^\d{6}$/.test(cols[1]) && cols[2]?.includes('TL')
    })

    const formatDate = (ym) => ym.slice(0,4) + '/' + ym.slice(4,6)

    const data = rows.map(l => {
      const cols = l.split(',').map(c => c.replace(/"/g,'').trim())
      return {
        date: formatDate(cols[1]),
        nominal:   parseFloat(cols[6])  || null,  // 現金給与総額
        scheduled: parseFloat(cols[7])  || null,  // 所定内給与
        real:      parseFloat(cols[9])  || null,  // 実質賃金
      }
    }).filter(d => d.date).slice(-24)

    return Response.json({ data, headers, sample: rows.slice(0,2) })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
