export const dynamic = 'force-dynamic'

const B = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// 概況品別国別表 — time axis is ANNUAL; monthly data lives in the TAB dimension
const EXP_ID = '0003425295'  // 輸出 2021-2025
const IMP_ID = '0003425296'  // 輸入 2021-2025

const COUNTRY = { USA: '304', China: '105', Korea: '103' }
const TOP_CATS = ['0','1','2','3','4','5','6','7','8','9']

// Export commodity cat01 codes
const EXP_CAT = { auto: '70503', semicon: '703', machinery: '701', chemicals: '5' }
// Import commodity cat01 codes
const IMP_CAT = { crude_oil: '303', lng: '305', food: '0' }

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  // ── Metadata ───────────────────────────────────────────────────────────────
  const getMeta = async (id) => {
    const r = await fetch(`${B}/getMetaInfo?appId=${APP_ID}&statsDataId=${id}`, { cache: 'no-store' })
    const j = await r.json()
    const raw = j?.GET_META_INFO?.CLASS_INF?.CLASS_OBJ ?? []
    return Array.isArray(raw) ? raw : [raw]
  }

  const [expMeta, impMeta] = await Promise.all([getMeta(EXP_ID), getMeta(IMP_ID)])

  const extractDims = (meta) => {
    const dims = {}
    for (const obj of meta) {
      const cls = Array.isArray(obj.CLASS) ? obj.CLASS : (obj.CLASS ? [obj.CLASS] : [])
      dims[obj['@id']] = cls
    }
    return dims
  }

  const expDims = extractDims(expMeta)
  const impDims = extractDims(impMeta)

  // Tab codes: month 1–12 → tab code for 金額 (value in 千円)
  const buildMonthTabMap = (tabCls) => {
    const map = {}   // month (1-12) → tab code
    const rev = {}   // tab code → month (1-12)
    for (const cls of tabCls) {
      const name = cls['@name'] ?? ''
      const m = name.match(/^(\d+)月/)
      if (m && /金額/.test(name)) {
        const month = parseInt(m[1])
        map[month] = cls['@code']
        rev[cls['@code']] = month
      }
    }
    return { map, rev }
  }

  const { map: expMonthMap, rev: expMonthRev } = buildMonthTabMap(expDims.tab ?? [])
  const { map: impMonthMap, rev: impMonthRev } = buildMonthTabMap(impDims.tab ?? [])

  // Find total/world code in cat02 and cat01
  const findTotal = (cls, names) => {
    for (const n of names) {
      const found = cls.find(c => c['@name'] === n)
      if (found) return found['@code']
    }
    return null
  }

  const expTotalCat02 = findTotal(expDims.cat02 ?? [], ['合計', '世界計', 'World', '全世界'])
  const impTotalCat02 = findTotal(impDims.cat02 ?? [], ['合計', '世界計', 'World', '全世界'])
  const expTotalCat01 = findTotal(expDims.cat01 ?? [], ['合計', '総額', '輸出総額'])
  const impTotalCat01 = findTotal(impDims.cat01 ?? [], ['合計', '総額', '輸入総額'])

  const hasMonthlyTabs = Object.keys(expMonthMap).length >= 12

  console.log('[Trade] hasMonthlyTabs:', hasMonthlyTabs,
    '| expMonthMap keys:', Object.keys(expMonthMap).join(','),
    '| expTotalCat02:', expTotalCat02,
    '| expTotalCat01:', expTotalCat01)

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchRaw = async (id, { cat01, cat02, tab } = {}) => {
    const p = new URLSearchParams({ appId: APP_ID, statsDataId: id, metaGetFlg: 'N', limit: '10000' })
    if (cat01) p.set('cdCat01', cat01)
    if (cat02) p.set('cdCat02', cat02)
    if (tab)   p.set('cdTab', tab)
    const res = await fetch(`${B}/getStatsData?${p}`, { cache: 'no-store' })
    const json = await res.json()
    const vals = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
    if (!vals.length) console.warn(`[Trade] no data: id=${id} cat01=${cat01||'—'} cat02=${cat02||'—'} tab=${tab||'—'}`)
    return vals
  }

  // Parse rows (fetched with NO tab filter) into monthly time series using reverse tab map
  // Each row has @time (annual YYYY000000), @tab (tab code), value
  const parseMonthly = (rows, monthRevMap) => {
    const m = {}
    for (const v of rows) {
      const month = monthRevMap[v['@tab']]
      if (!month) continue
      const year = (v['@time'] ?? '').slice(0, 4)
      if (!year || year < '2021') continue
      const date = `${year}/${String(month).padStart(2, '0')}`
      const val = parseFloat(v['$'])
      if (!isNaN(val)) m[date] = (m[date] ?? 0) + val
    }
    return m
  }

  const mapToSeries = (map) =>
    Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).slice(-24).map(([date, value]) => ({ date, value }))

  const mergeMapAdd = (...maps) => {
    const out = {}
    for (const m of maps) for (const [k, v] of Object.entries(m)) out[k] = (out[k] ?? 0) + v
    return out
  }

  // ── Strategy A: tab-based (monthly in tab dimension) ──────────────────────
  if (hasMonthlyTabs) {
    // Total: sum TOP_CATS (no tab filter — parse all tabs in one pass per cat)
    const [expTopRows, impTopRows] = await Promise.all([
      Promise.all(TOP_CATS.map(c => fetchRaw(EXP_ID, { cat01: c, cat02: expTotalCat02 }))),
      Promise.all(TOP_CATS.map(c => fetchRaw(IMP_ID, { cat01: c, cat02: impTotalCat02 }))),
    ])
    const expTotalMap = mergeMapAdd(...expTopRows.map(rows => parseMonthly(rows, expMonthRev)))
    const impTotalMap = mergeMapAdd(...impTopRows.map(rows => parseMonthly(rows, impMonthRev)))

    // Export breakdowns
    const [expAutoR, expSeconR, expMachR, expChemR] = await Promise.all([
      fetchRaw(EXP_ID, { cat01: EXP_CAT.auto,      cat02: expTotalCat02 }),
      fetchRaw(EXP_ID, { cat01: EXP_CAT.semicon,   cat02: expTotalCat02 }),
      fetchRaw(EXP_ID, { cat01: EXP_CAT.machinery, cat02: expTotalCat02 }),
      fetchRaw(EXP_ID, { cat01: EXP_CAT.chemicals, cat02: expTotalCat02 }),
    ])

    // Import breakdowns
    const [impCrudeR, impLngR, impFoodR] = await Promise.all([
      fetchRaw(IMP_ID, { cat01: IMP_CAT.crude_oil, cat02: impTotalCat02 }),
      fetchRaw(IMP_ID, { cat01: IMP_CAT.lng,       cat02: impTotalCat02 }),
      fetchRaw(IMP_ID, { cat01: IMP_CAT.food,      cat02: impTotalCat02 }),
    ])

    // Country breakdowns — use totalCat01 if available, else sum TOP_CATS
    const fetchCountry = async (id, countryCat02, monthRevMap, totalCat01, totalCat02) => {
      if (totalCat01) {
        const rows = await fetchRaw(id, { cat01: totalCat01, cat02: countryCat02 })
        return parseMonthly(rows, monthRevMap)
      }
      const topRows = await Promise.all(TOP_CATS.map(c => fetchRaw(id, { cat01: c, cat02: countryCat02 })))
      return mergeMapAdd(...topRows.map(r => parseMonthly(r, monthRevMap)))
    }

    const [eUSAm, eChinam, eKoream, iUSAm, iChinam, iKoream] = await Promise.all([
      fetchCountry(EXP_ID, COUNTRY.USA,   expMonthRev, expTotalCat01, expTotalCat02),
      fetchCountry(EXP_ID, COUNTRY.China, expMonthRev, expTotalCat01, expTotalCat02),
      fetchCountry(EXP_ID, COUNTRY.Korea, expMonthRev, expTotalCat01, expTotalCat02),
      fetchCountry(IMP_ID, COUNTRY.USA,   impMonthRev, impTotalCat01, impTotalCat02),
      fetchCountry(IMP_ID, COUNTRY.China, impMonthRev, impTotalCat01, impTotalCat02),
      fetchCountry(IMP_ID, COUNTRY.Korea, impMonthRev, impTotalCat01, impTotalCat02),
    ])

    const expTotal = mapToSeries(expTotalMap)
    const impTotal = mapToSeries(impTotalMap)
    const months = expTotal.map(v => v.date)

    const computeNet = (eArr, iArr) => {
      const im = Object.fromEntries(iArr.map(v => [v.date, v.value]))
      return eArr.map(v => ({ date: v.date, value: v.value - (im[v.date] ?? 0) }))
    }

    const eUSA = mapToSeries(eUSAm), iUSA = mapToSeries(iUSAm)
    const eChina = mapToSeries(eChinam), iChina = mapToSeries(iChinam)
    const eKorea = mapToSeries(eKoream), iKorea = mapToSeries(iKoream)

    return Response.json({
      months,
      export: {
        total:     expTotal,
        auto:      mapToSeries(parseMonthly(expAutoR,  expMonthRev)),
        semicon:   mapToSeries(parseMonthly(expSeconR, expMonthRev)),
        machinery: mapToSeries(parseMonthly(expMachR,  expMonthRev)),
        chemicals: mapToSeries(parseMonthly(expChemR,  expMonthRev)),
      },
      import: {
        total:     impTotal,
        crude_oil: mapToSeries(parseMonthly(impCrudeR, impMonthRev)),
        lng:       mapToSeries(parseMonthly(impLngR,   impMonthRev)),
        food:      mapToSeries(parseMonthly(impFoodR,  impMonthRev)),
      },
      byDest: {
        USA:   { export: eUSA,   import: iUSA,   net: computeNet(eUSA,   iUSA)   },
        China: { export: eChina, import: iChina, net: computeNet(eChina, iChina) },
        Korea: { export: eKorea, import: iKorea, net: computeNet(eKorea, iKorea) },
      },
    })
  }

  // ── Strategy B: fallback — monthly time axis (YYYY00MM00 format) ───────────
  console.warn('[Trade] No tab-based monthly codes found, falling back to time-axis strategy')
  const isMonthly = (v) => {
    const t = v['@time']
    if (!t || t.length !== 10) return false
    return t.slice(4, 6) === '00' && parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
  }
  const fmtTime = (t) => t.slice(0, 4) + '/' + t.slice(6, 8)

  const toSeriesFallback = (rows) => {
    const m = {}
    for (const v of rows) {
      if (!isMonthly(v)) continue
      const d = fmtTime(v['@time'])
      const val = parseFloat(v['$'])
      if (!isNaN(val)) m[d] = (m[d] ?? 0) + val
    }
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).slice(-24).map(([date, value]) => ({ date, value }))
  }

  const sumSeriesFallback = (...arrs) => {
    const m = {}
    for (const arr of arrs) for (const { date, value } of arr) m[date] = (m[date] ?? 0) + value
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }))
  }

  const [expTopFb, impTopFb] = await Promise.all([
    Promise.all(TOP_CATS.map(c => fetchRaw(EXP_ID, { cat01: c }).then(toSeriesFallback))),
    Promise.all(TOP_CATS.map(c => fetchRaw(IMP_ID, { cat01: c }).then(toSeriesFallback))),
  ])

  const expTotal = sumSeriesFallback(...expTopFb).slice(-24)
  const impTotal = sumSeriesFallback(...impTopFb).slice(-24)
  const months = expTotal.map(v => v.date)

  return Response.json({
    months,
    export: { total: expTotal, auto: [], semicon: [], machinery: [], chemicals: [] },
    import: { total: impTotal, crude_oil: [], lng: [], food: [] },
    byDest: {
      USA:   { export: [], import: [], net: [] },
      China: { export: [], import: [], net: [] },
      Korea: { export: [], import: [], net: [] },
    },
  })
}
