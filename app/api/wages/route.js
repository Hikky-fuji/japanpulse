export const dynamic = 'force-dynamic'

export async function GET() {
  const url = 'https://www.e-stat.go.jp/stat-search/file-download?statInfId=000031771318&fileKind=1'
  
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const text = await res.text()
    // 最初の500文字だけ返してCSVの中身を確認
    return Response.json({ 
      status: res.status,
      preview: text.slice(0, 500),
      ok: res.ok
    })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
