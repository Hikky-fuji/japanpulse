export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID
  const LATEST_ID = process.env.ESTAT_IIP_LATEST_ID

  try {
    const XLSX = await import('xlsx')
    const url = `https://www.e-stat.go.jp/stat-search/file-download?statInfId=${LATEST_ID}&fileKind=0`
    const res = await fetch(url, { cache: 'no-store' })
    const buf = await res.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets['鉱工業']

    // A列の最初の30行を確認
    const preview = []
    for (let r = 1; r <= 30; r++) {
      const a = ws[`A${r}`]
      const b = ws[`B${r}`]
      const e = ws[`E${r}`]
      preview.push({
        row: r,
        A: a?.v ?? null,
        B: b?.v ?? null,
        E: e?.v ?? null,
      })
    }
    return Response.json({ preview })
  } catch (e) {
    return Response.json({ error: e.message })
  }
}
