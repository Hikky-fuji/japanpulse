export const dynamic = 'force-dynamic'

const B = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// 概況品別国別表
// - time axis: annual (2021000000 … 2025000000)
// - cat01: 8-digit code = SITC string padded with trailing zeros to 8 chars
// - cat02: 120=合計_金額, 140=1月_金額, 160=2月_金額, … 360=12月_金額  (pattern: 120 + M*20)
// - area: 5-digit country/region code  50103=韓国 50105=中国 50304=米国 50000=世界計(est.)

const EXP_ID = '0003425295'
const IMP_ID = '0003425296'

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

const COUNTRY_AREA = { USA: '50304', China: '50105', Korea: '50103' }

// reverse map: cat02 code → month (only 金額 codes 140,160,...,360)
const MONTH_REV = {}
for (let m = 1; m <= 12; m++) MONTH_REV[String(120 + m * 20)] = m
// cat02 range covering all monthly values (130=1月数量 … 360=12月金額)
const RANGE = { cat02From: '130', cat02To: '360' }

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  // ── Find world area code from metadata ───────────────────────────────────
  const getWorldArea = async () => {
    const r = await fetch(`${B}/getMetaInfo?appId=${APP_ID}&statsDataId=${EXP_ID}`, { cache: 'no-store' })
    const j = await r.json()
    const objs = j?.GET_META_INFO?.METADATA_INF?.CLASS_INF?.CLASS_OBJ ?? []
    const arr = Array.isArray(objs) ? objs : [objs]
    const areaObj = arr.find(o => o['@id'] === 'area')
    const cls = areaObj ? (Array.isArray(areaObj.CLASS) ? areaObj.CLASS : [areaObj.CLASS]) : []
    const found = cls.find(c => /世界計|World/.test(c['@name']) || /^0+$/.test(c['@code']))
    console.log('[Trade] areaList first 3:', cls.slice(0,3).map(c=>`${c['@code']}=${c['@name']}`).join(' | '))
    console.log('[Trade] areaList last 3:', cls.slice(-3).map(c=>`${c['@code']}=${c['@name']}`).join(' | '))
    // Try CPI-style '00000', then '50000', then null (no filter = sum all)
    const worldCode = found?.['@code'] ?? '00000'
    console.log('[Trade] worldArea:', worldCode)
    return worldCode
  }

  const WORLD = await getWorldArea()

  // ── Data fetch ───────────────────────────────────────────────────────────
  const fetchRaw = async (statsDataId, { cat01, area, cat02From, cat02To } = {}) => {
    const p = new URLSearchParams({ appId: APP_ID, statsDataId, metaGetFlg: 'N', limit: '2000' })
    if (cat01)     p.set('cdCat01', cat01)
    if (area)      p.set('cdArea', area)
    if (cat02From) p.set('cdCat02From', cat02From)
    if (cat02To)   p.set('cdCat02To', cat02To)
    const res = await fetch(`${B}/getStatsData?${p}`, { cache: 'no-store' })
    const json = await res.json()
    const vals = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
    if (!vals.length) console.warn(`[Trade] no data: ${statsDataId} cat01=${cat01||'—'} area=${area||'—'}`)
    return vals
  }

  // Parse raw rows → date→value map (filters to 金額 months only via MONTH_REV)
  const parseMonthly = (rows) => {
    const map = {}
    for (const v of rows) {
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

  // ── Phase 1: totals (sum TOP_CATS, world area) ───────────────────────────
  const [expTopRows, impTopRows] = await Promise.all([
    Promise.all(TOP_CATS.map(c => fetchRaw(EXP_ID, { cat01: c, area: WORLD, ...RANGE }))),
    Promise.all(TOP_CATS.map(c => fetchRaw(IMP_ID, { cat01: c, area: WORLD, ...RANGE }))),
  ])
  const expTotalMap = addMaps(...expTopRows.map(parseMonthly))
  const impTotalMap = addMaps(...impTopRows.map(parseMonthly))

  // ── Phase 2: commodity breakdowns ───────────────────────────────────────
  const [expAutoR, expSeconR, expMachR, expChemR,
         impCrudeR, impLngR, impFoodR] = await Promise.all([
    fetchRaw(EXP_ID, { cat01: EXP_CAT.auto,      area: WORLD, ...RANGE }),
    fetchRaw(EXP_ID, { cat01: EXP_CAT.semicon,   area: WORLD, ...RANGE }),
    fetchRaw(EXP_ID, { cat01: EXP_CAT.machinery, area: WORLD, ...RANGE }),
    fetchRaw(EXP_ID, { cat01: EXP_CAT.chemicals, area: WORLD, ...RANGE }),
    fetchRaw(IMP_ID, { cat01: IMP_CAT.crude_oil, area: WORLD, ...RANGE }),
    fetchRaw(IMP_ID, { cat01: IMP_CAT.lng,       area: WORLD, ...RANGE }),
    fetchRaw(IMP_ID, { cat01: IMP_CAT.food,      area: WORLD, ...RANGE }),
  ])

  // ── Phase 3: country breakdowns (sum all TOP_CATS per country) ───────────
  const fetchCountry = async (statsDataId, areaCode) => {
    const rows = await Promise.all(TOP_CATS.map(c => fetchRaw(statsDataId, { cat01: c, area: areaCode, ...RANGE })))
    return rows.flat()
  }

  const [eUSARows, iUSARows, eChinaRows, iChinaRows, eKoreaRows, iKoreaRows] = await Promise.all([
    fetchCountry(EXP_ID, COUNTRY_AREA.USA),
    fetchCountry(IMP_ID, COUNTRY_AREA.USA),
    fetchCountry(EXP_ID, COUNTRY_AREA.China),
    fetchCountry(IMP_ID, COUNTRY_AREA.China),
    fetchCountry(EXP_ID, COUNTRY_AREA.Korea),
    fetchCountry(IMP_ID, COUNTRY_AREA.Korea),
  ])

  const expTotal = toSeries(expTotalMap)
  const impTotal = toSeries(impTotalMap)
  const months   = expTotal.map(v => v.date)

  const eUSA   = toSeries(addMaps(parseMonthly(eUSARows)))
  const iUSA   = toSeries(addMaps(parseMonthly(iUSARows)))
  const eChina = toSeries(addMaps(parseMonthly(eChinaRows)))
  const iChina = toSeries(addMaps(parseMonthly(iChinaRows)))
  const eKorea = toSeries(addMaps(parseMonthly(eKoreaRows)))
  const iKorea = toSeries(addMaps(parseMonthly(iKoreaRows)))

  console.log('[Trade] result: months=', months.length, 'expTotal rows=', expTotal.length,
    'impTotal rows=', impTotal.length, 'eUSA rows=', eUSA.length)

  return Response.json({
    months,
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
    byDest: {
      USA:   { export: eUSA,   import: iUSA,   net: computeNet(eUSA,   iUSA)   },
      China: { export: eChina, import: iChina, net: computeNet(eChina, iChina) },
      Korea: { export: eKorea, import: iKorea, net: computeNet(eKorea, iKorea) },
    },
  })
}
