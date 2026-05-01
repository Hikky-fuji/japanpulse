export const dynamic = 'force-dynamic'

const APP_ID = process.env.ESTAT_APP_ID

const SECTORS = [
  { code: 'K1D000000I', label: '第３次産業総合',    weight: 10000  },
  { code: 'DB00000I',   label: '情報通信業',         weight: 1157.1 },
  { code: 'DC00000I',   label: '運輸業、郵便業',     weight: 914.1  },
  { code: 'DE00000I',   label: '金融業、保険業',     weight: 794.5  },
  { code: 'DG00000I',   label: '小売業',             weight: 1104.7 },
  { code: 'DI00000I',   label: '医療、福祉',         weight: 1175.5 },
  { code: 'DJB0000I',   label: '飲食店・飲食サービス業', weight: 280.3  },
  { code: 'DJA0000I',   label: '宿泊業',             weight: 62.1   },
]

async function findStatInfIds(year) {
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getDataCatalog`
    + `?appId=${APP_ID}&searchWord=第3次産業活動指数&surveyYears=${year}&dataType=XLS&limit=5`
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const items = json?.GET_DATA_CATALOG?.DATA_CATALOG_LIST_INF?.DATA_CATALOG_INF ?? []
  const arr = Array.isArray(items) ? items : [items]

  const monthly = arr.find(item => item?.DATASET?.TITLE?.CYCLE === '月次')
  if (!monthly) return null

  const resources = monthly?.RESOURCES?.RESOURCE ?? []
  const list = Array.isArray(resources) ? resources : [resources]

  let nsaId = null, saId = null
  for (const r of list) {
    const url2 = r?.URL ?? ''
    const m = url2.match(/statInfId=(\d+)/)
    if (!m) continue
    const sub = r?.TITLE?.TABLE_SUB_CATEGORY1 ?? ''
    const name = r?.TITLE?.NAME ?? ''
    if (sub === '原指数' && name.includes('月次')) nsaId = m[1]
    if (sub === '季節調整済指数' && name.includes('月次')) saId = m[1]
  }
  return nsaId && saId ? { nsaId, saId } : null
}

async function downloadAndParse(statInfId) {
  const url = `https://www.e-stat.go.jp/stat-search/file-download?statInfId=${statInfId}&fileKind=0`
  const res = await fetch(url, { cache: 'no-store' })
  const buf = await res.arrayBuffer()
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets['ITA']
  if (!ws) throw new Error('ITA sheet not found')

  const range = XLSX.utils.decode_range(ws['!ref'])

  // Row 3 (index 2): date headers starting from col D (index 3)
  const dates = []
  for (let c = 3; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_col(c) + '3']
    if (cell && typeof cell.v === 'number') dates.push(String(cell.v))
  }

  // Find sector rows
  const sectorRows = {}
  for (let r = 4; r <= range.e.r + 1; r++) {
    const cellA = ws['A' + r]
    if (!cellA) continue
    const code = String(cellA.v)
    if (SECTORS.find(s => s.code === code)) sectorRows[code] = r
  }

  // Extract time series for each sector
  const result = {}
  for (const sector of SECTORS) {
    const row = sectorRows[sector.code]
    if (!row) continue
    const series = []
    for (let i = 0; i < dates.length; i++) {
      const col = XLSX.utils.encode_col(i + 3)
      const cell = ws[col + row]
      const val = cell && typeof cell.v === 'number' ? cell.v : parseFloat(cell?.v)
      const yyyymm = dates[i]
      series.push({
        date: yyyymm.slice(0, 4) + '/' + yyyymm.slice(4, 6),
        value: isNaN(val) ? null : val,
      })
    }
    result[sector.code] = series
  }

  return result
}

export async function GET() {
  try {
    const year = new Date().getFullYear()
    let ids = await findStatInfIds(year)
    if (!ids) ids = await findStatInfIds(year - 1)
    if (!ids) return Response.json({ error: 'Could not find TSIP file IDs' }, { status: 500 })

    const [nsaData, saData] = await Promise.all([
      downloadAndParse(ids.nsaId),
      downloadAndParse(ids.saId),
    ])

    // Compute YoY from NSA, MoM from SA
    const makeYoYMap = (series) => {
      const map = Object.fromEntries(series.map(d => [d.date, d.value]))
      const result = {}
      for (const d of series) {
        const [y, m] = d.date.split('/')
        const priorDate = `${parseInt(y) - 1}/${m}`
        if (map[priorDate] != null && d.value != null) {
          result[d.date] = parseFloat(((d.value - map[priorDate]) / map[priorDate] * 100).toFixed(2))
        }
      }
      return result
    }

    const makeMoMMap = (series) => {
      const result = {}
      for (let i = 1; i < series.length; i++) {
        const cur = series[i], prev = series[i - 1]
        if (cur.value != null && prev.value != null) {
          result[cur.date] = parseFloat(((cur.value - prev.value) / prev.value * 100).toFixed(2))
        }
      }
      return result
    }

    // Build combined series for all sectors, last 24 months
    const totalNsa = nsaData['K1D000000I'] ?? []
    const totalSa  = saData['K1D000000I']  ?? []
    const allDates = totalNsa.slice(-24).map(d => d.date)

    const series = SECTORS.map(sector => {
      const nsa = nsaData[sector.code] ?? []
      const sa  = saData[sector.code]  ?? []
      const yoyMap = makeYoYMap(nsa)
      const momMap = makeMoMMap(sa)
      const nsaMap = Object.fromEntries(nsa.map(d => [d.date, d.value]))
      const saMap  = Object.fromEntries(sa.map(d => [d.date, d.value]))

      return {
        code:   sector.code,
        label:  sector.label,
        weight: sector.weight,
        data: allDates.map(date => ({
          date,
          nsa: nsaMap[date] ?? null,
          sa:  saMap[date]  ?? null,
          yoy: yoyMap[date] ?? null,
          mom: momMap[date] ?? null,
        })),
      }
    })

    const total = series.find(s => s.code === 'K1D000000I')
    const latest = total?.data.at(-1)
    const prev   = total?.data.at(-2)

    return Response.json({
      latest: {
        date: latest?.date,
        nsa:  latest?.nsa,
        sa:   latest?.sa,
        yoy:  latest?.yoy,
        mom:  latest?.mom,
        yoyPrev: prev?.yoy,
        momPrev: prev?.mom,
      },
      series,
    })
  } catch (e) {
    console.error('[TSIP]', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
