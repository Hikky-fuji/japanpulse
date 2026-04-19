export const dynamic = 'force-dynamic'

export async function GET() {
  const url = 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040270648&fileKind=1'

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const buffer = await res.arrayBuffer()
    const text = new TextDecoder('shift-jis').decode(buffer)
    
    const lines = text.trim().split('\r\n')
    return Response.json({ 
      total_lines: lines.length,
      line0: lines[0].slice(0, 200),  // ヘッダー行1
      line1: lines[1].slice(0, 200),  // ヘッダー行2
      line2: lines[2].slice(0, 200),  // データ行1
      line3: lines[3].slice(0, 200),  // データ行2
    })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
