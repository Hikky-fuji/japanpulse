export const dynamic = 'force-dynamic'

export async function GET() {
  const url = 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040270648&fileKind=1'

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const buffer = await res.arrayBuffer()
    const text = new TextDecoder('shift-jis').decode(buffer)
    const lines = text.trim().split('\r\n')

    // 年・月ヘッダーからdate列を構築
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

    // 消費支出行（line14, 0-indexed）
    const row = lines[14].split(',')
    const vals = row.slice(6)

    const data = dates
      .map((date, i) => ({ date, value: vals[i] }))
      .filter(d => d.date && d.value && d.value.trim() !== '-' && d.value.trim() !== '')
      .map(d => ({ date: d.date, value: parseFloat(d.value) }))
      .slice(-24)

    return Response.json({ data })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
