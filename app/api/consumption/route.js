export const dynamic = 'force-dynamic'

export async function GET() {
  const url = 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000040270648&fileKind=1'

  try {
    const res = await fetch(url, { cache: 'no-store' })
    const buffer = await res.arrayBuffer()
    const text = new TextDecoder('shift-jis').decode(buffer)
    return Response.json({ 
      status: res.status,
      preview: text.slice(0, 800),
      ok: res.ok
    })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
