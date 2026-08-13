export const revalidate = 21600
export const dynamic = 'force-dynamic'

const B = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// 概況品別国別表
// - time axis: annual (2021000000 … 2025000000)
// - cat01: 8-digit code = SITC string padded with trailing zeros to 8 chars
// - cat02: 120=合計_金額, 140=1月_金額, 160=2月_金額, … 360=12月_金額  (pattern: 120 + M*20)
// - area: 5-digit country/region code  50103=韓国 50105=中国 50304=米国 50000=世界計(est.)

const EXP_ID = '0003425295'
const IMP_ID = '0003425296'
const CUSTOMS_WORLD_URL = 'https://www.customs.go.jp/toukei/suii/html/data/d41ma.csv'

function parseCsvRow(row) {
  const cells = []
  let value = ''
  let quoted = false
  for (let index = 0; index < row.length; index += 1) {
    const character = row[index]
    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      cells.push(value.trim())
      value = ''
    } else {
      value += character
    }
  }
  cells.push(value.trim())
  return cells
}

function numericCell(value) {
  const normalized = String(value ?? '')
    .replace(/[,\s]/g, '')
    .replace(/^△/, '-')
    .replace(/^\((.+)\)$/, '-$1')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseCustomsWorldCsv(buffer) {
  const text = new TextDecoder('shift_jis').decode(buffer).replace(/^\uFEFF/, '')
  const observations = text.split(/\r?\n/).flatMap(row => {
    const cells = parseCsvRow(row)
    const dateIndex = cells.findIndex(cell => /^\d{4}(?:[./-]\d{1,2}|年\d{1,2}月)/.test(cell))
    if (dateIndex < 0) return []
    const dateMatch = cells[dateIndex].match(/^(\d{4})(?:[./-]|年)(\d{1,2})/)
    if (!dateMatch) return []
    const values = cells.slice(dateIndex + 1).map(numericCell).filter(value => value !== null)
    if (values.length < 2 || values[0] <= 0 || values[1] <= 0) return []
    return [{
      date: `${dateMatch[1]}/${String(Number(dateMatch[2])).padStart(2, '0')}`,
      export: values[0],
      import: values[1],
    }]
  })
  const unique = [...new Map(observations.map(item => [item.date, item])).values()]
    .sort((left, right) => left.date.localeCompare(right.date))
  if (unique.length < 12) throw new Error('Japan Customs CSV did not contain usable monthly totals')
  return unique.slice(-24)
}

async function fetchCustomsWorld() {
  const response = await fetch(CUSTOMS_WORLD_URL, { next: { revalidate } })
  if (!response.ok) throw new Error(`Japan Customs returned HTTP ${response.status}`)
  return parseCustomsWorldCsv(await response.arrayBuffer())
}

const sitc8 = (s) => String(s).padEnd(8, '0')
const TOP_CATS = ['0','1','2','3','4','5','6','7','8','9'].map(sitc8)

const EXP_CAT = {
  auto:      sitc8('70503'),
  semicon:   sitc8('703'),
  machinery: sitc8('701'),
  chemicals: sitc8('5'),
}
const IMP_CAT = {
  crude_oil: sitc8('303'),
  lng:       sitc8('305'),
  food:      sitc8('0'),
}

// Major trade partners shown on the world map. These are official customs
// area codes from the e-Stat trade table metadata.
const COUNTRY_AREA = {
  USA: '50304',
  China: '50105',
  Korea: '50103',
  Taiwan: '50106',
  HongKong: '50108',
  Thailand: '50111',
  Singapore: '50112',
  Malaysia: '50113',
  Philippines: '50117',
  Indonesia: '50118',
  India: '50123',
  Vietnam: '50124',
  UK: '50205',
  Germany: '50213',
  Canada: '50302',
  Mexico: '50305',
  Australia: '50601',
}

// reverse map: cat02 code → month (only 金額 codes 140,160,...,360)
const MONTH_REV = {}
for (let m = 1; m <= 12; m++) MONTH_REV[String(120 + m * 20)] = m
// cat02 range covering all monthly values (130=1月数量 … 360=12月金額)
const RANGE = { cat02From: '130', cat02To: '360' }

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID
  const customsHeadlinePromise = fetchCustomsWorld().catch(error => {
    console.warn('[Trade] current Customs headline unavailable:', error.message)
    return null
  })

  // ── Find world area code from metadata ───────────────────────────────────
  const getWorldArea = async () => {
    const r = await fetch(`${B}/getMetaInfo?appId=${APP_ID}&statsDataId=${EXP_ID}`, { next: { revalidate } })
    const j = await r.json()
    const objs = j?.GET_META_INFO?.METADATA_INF?.CLASS_INF?.CLASS_OBJ ?? []
    const arr = Array.isArray(objs) ? objs : [objs]
    const areaObj = arr.find(o => o['@id'] === 'area')
    const cls = areaObj ? (Array.isArray(areaObj.CLASS) ? areaObj.CLASS : [areaObj.CLASS]) : []
    const found = cls.find(c => /世界計|World/.test(c['@name']) || /^0+$/.test(c['@code']))
    // Try CPI-style '00000', then '50000', then null (no filter = sum all)
    const worldCode = found?.['@code'] ?? '00000'
    return worldCode
  }

  const WORLD = await getWorldArea()

  // ── Data fetch ───────────────────────────────────────────────────────────
  const fetchRaw = async (statsDataId, { cat01, area, cat02From, cat02To } = {}) => {
    const p = new URLSearchParams({ appId: APP_ID, statsDataId, metaGetFlg: 'N', limit: '100000' })
    if (cat01)     p.set('cdCat01', cat01)
    if (area)      p.set('cdArea', area)
    if (cat02From) p.set('cdCat02From', cat02From)
    if (cat02To)   p.set('cdCat02To', cat02To)
    const res = await fetch(`${B}/getStatsData?${p}`, { next: { revalidate } })
    const json = await res.json()
    const vals = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
    if (!vals.length) console.warn(`[Trade] no data: ${statsDataId} cat01=${cat01||'—'} area=${area||'—'}`)
    return vals
  }

  // Parse raw rows → date→value map (filters to 金額 months only via MONTH_REV)
  const parseMonthly = (rows, areaCode = null) => {
    const map = {}
    for (const v of rows) {
      if (areaCode && v['@area'] !== areaCode) continue
      const month = MONTH_REV[v['@cat02']]
      if (!month) continue
      const year = (v['@time'] ?? '').slice(0, 4)
      if (!year || year < '2021') continue
      const date = `${year}/${String(month).padStart(2, '0')}`
      const val = parseFloat(v['$'])
      if (!isNaN(val)) map[date] = (map[date] ?? 0) + val
    }
    return map
  }

  const addMaps = (...maps) => {
    const out = {}
    for (const m of maps) for (const [k, v] of Object.entries(m)) out[k] = (out[k] ?? 0) + v
    return out
  }

  const toSeries = (map) =>
    Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).slice(-24).map(([date, value]) => ({ date, value }))

  const computeNet = (expArr, impArr) => {
    const im = Object.fromEntries(impArr.map(v => [v.date, v.value]))
    return expArr.map(v => ({ date: v.date, value: v.value - (im[v.date] ?? 0) }))
  }

  // ── Phase 1: totals (sum TOP_CATS, no area filter = all countries) ───────
  const [expTopRows, impTopRows] = await Promise.all([
    Promise.all(TOP_CATS.map(c => fetchRaw(EXP_ID, { cat01: c, ...RANGE }))),
    Promise.all(TOP_CATS.map(c => fetchRaw(IMP_ID, { cat01: c, ...RANGE }))),
  ])
  const expTotalMap = addMaps(...expTopRows.map(parseMonthly))
  const impTotalMap = addMaps(...impTopRows.map(parseMonthly))

  // ── Phase 2: commodity breakdowns (no area filter = all destinations) ────
  const [expAutoR, expSeconR, expMachR, expChemR,
         impCrudeR, impLngR, impFoodR] = await Promise.all([
    fetchRaw(EXP_ID, { cat01: EXP_CAT.auto,      ...RANGE }),
    fetchRaw(EXP_ID, { cat01: EXP_CAT.semicon,   ...RANGE }),
    fetchRaw(EXP_ID, { cat01: EXP_CAT.machinery, ...RANGE }),
    fetchRaw(EXP_ID, { cat01: EXP_CAT.chemicals, ...RANGE }),
    fetchRaw(IMP_ID, { cat01: IMP_CAT.crude_oil, ...RANGE }),
    fetchRaw(IMP_ID, { cat01: IMP_CAT.lng,       ...RANGE }),
    fetchRaw(IMP_ID, { cat01: IMP_CAT.food,      ...RANGE }),
  ])

  const detailExpTotal = toSeries(expTotalMap)
  const detailImpTotal = toSeries(impTotalMap)
  const customsHeadline = await customsHeadlinePromise
  const expTotal = customsHeadline?.map(item => ({ date: item.date, value: item.export })) || detailExpTotal
  const impTotal = customsHeadline?.map(item => ({ date: item.date, value: item.import })) || detailImpTotal
  const months = expTotal.map(v => v.date)
  const detailLatest = detailExpTotal.at(-1)?.date ?? null
  const headlineLatest = expTotal.at(-1)?.date ?? null

  // Phase 1 already contains every area for each top-level SITC category.
  // Reuse those rows for country totals instead of making 20 extra requests
  // per country. This keeps the expanded map within the existing API load.
  const byDest = Object.fromEntries(
    Object.entries(COUNTRY_AREA).map(([country, areaCode]) => {
      const countryExp = toSeries(addMaps(...expTopRows.map(rows => parseMonthly(rows, areaCode))))
      const countryImp = toSeries(addMaps(...impTopRows.map(rows => parseMonthly(rows, areaCode))))
      return [country, {
        export: countryExp,
        import: countryImp,
        net: computeNet(countryExp, countryImp),
      }]
    })
  )

  return Response.json({
    months,
    _meta: {
      headlineMode: customsHeadline ? 'AUTO' : 'E-STAT FALLBACK',
      headlineLatest,
      detailMode: 'REFERENCE SNAPSHOT',
      detailLatest,
      sourceUrl: CUSTOMS_WORLD_URL,
    },
    export: {
      total:     expTotal,
      auto:      toSeries(parseMonthly(expAutoR)),
      semicon:   toSeries(parseMonthly(expSeconR)),
      machinery: toSeries(parseMonthly(expMachR)),
      chemicals: toSeries(parseMonthly(expChemR)),
    },
    import: {
      total:     impTotal,
      crude_oil: toSeries(parseMonthly(impCrudeR)),
      lng:       toSeries(parseMonthly(impLngR)),
      food:      toSeries(parseMonthly(impFoodR)),
    },
    byDest,
  })
}
