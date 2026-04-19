export const dynamic = 'force-dynamic'

export async function GET() {
  const url = 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040270648&fileKind=1'

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const buffer = await res.arrayBuffer()
    const text = new TextDecoder('shift-jis').decode(buffer)
    
    const lines = text.trim().split('\r\n')
    // line4〜8の品目名と最初の数値を確認
    return Response.json({ 
      line4: lines[4].slice(0, 300),
      line5: lines[5].slice(0, 300),
      line6: lines[6].slice(0, 300),
      line7: lines[7].slice(0, 300),
      line8: lines[8].slice(0, 300),
    })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
