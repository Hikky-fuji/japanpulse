export const dynamic = 'force-dynamic'

export async function GET() {
  const url = 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040270648&fileKind=1'

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const buffer = await res.arrayBuffer()
    const text = new TextDecoder('shift-jis').decode(buffer)
    const lines = text.trim().split('\r\n')

    const yearsRow = lines[1].split(',')
    const monthsRow = lines[3].split(',')
    const dates = []
    let currentYear = ''
    for (let i = 6; i < yearsRow.length; i++) {
      const y = yearsRow[i].trim().replace('年', '')
      if (y) currentYear = y
      const m = (monthsRow[i] || '').trim().replace('月', '').replace(/\s/g, '')
      dates.push(currentYear && m ? `${currentYear}/${m.padStart(2, '0')}` : '')
    }

    const parseSeries = (lineIndex) => {
      const row = lines[lineIndex].split(',')
      const vals = row.slice(6)
      return dates
        .map((date, i) => ({ date, value: vals[i] }))
        .filter(d => d.date && d.value && d.value.trim() !== '-' && d.value.trim() !== '')
        .map(d => ({ date: d.date, value: parseFloat(d.value) }))
        .slice(-24)
    }

    return Response.json({
      total:       parseSeries(14),   // 消費支出
      basic:       parseSeries(187),  // 基礎的支出
      discretionary: parseSeries(188), // 選択的支出
    })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
