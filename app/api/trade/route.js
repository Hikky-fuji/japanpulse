export const dynamic = 'force-dynamic'

export async function GET() {
  const APP_ID = process.env.ESTAT_APP_ID

  // 概況品別国別表 (Overview Commodity-Country Table)
  // NOTE: Verify these statsDataIds via: getStatsData?appId=APP_ID&statsDataId=ID&limit=1
  // If the dataset returns no monthly data, the API may be annual-only;
  // in that case switch to the file-download approach (getStatsList + statInfId).
  const EXP_MAIN = '0003425295'  // 輸出 2021-2025 (確報)
  const EXP_CUR  = '0004049327'  // 輸出 2026 (確報)
  const IMP_MAIN = '0003425296'  // 輸入 2021-2025 (速報→確報)
  const IMP_CUR  = '0004049328'  // 輸入 2026

  // 概況品 category codes (cat01)
  // Single-digit = top-level SITC group (mutually exclusive)
  //   '0'=食料品, '1'=飲料, '2'=原材料, '3'=鉱物性燃料, '4'=動植物油脂
  //   '5'=化学品, '6'=製品, '7'=機械類・輸送機器, '8'=雑製品, '9'=その他
  // Sub-codes: '701'=一般機械, '703'=電気機械, '705'=輸送機械, '70503'=自動車
  //            '303'=石油製品(原油含む), '305'=天然ガス(LNG)
  //
  // 国 country codes (cat02)
  //   '304'=USA, '105'=中国, '103'=韓国
  //   EU/ASEAN/中東は要確認 — 以下はプレースホルダー
  const COUNTRY_CODES = {
    USA:        '304',
    China:      '105',
    Korea:      '103',
    // EU:      '???',   // TODO: 要確認
    // ASEAN:   '???',   // TODO: 要確認
    // MiddleEast: '???', // TODO: 要確認
  }

  const isMonthly = (v) => {
    const t = v['@time']
    if (!t || t.length !== 10) return false
    return t.slice(4, 6) === '00' && parseInt(t.slice(6, 8)) >= 1 && parseInt(t.slice(6, 8)) <= 12
  }
  const fmt = (time) => time.slice(0, 4) + '/' + time.slice(6, 8)

  const fetchRaw = async (statsDataId, cat01, cat02) => {
    const params = new URLSearchParams({
      appId:       APP_ID,
      statsDataId,
      metaGetFlg:  'N',
      limit:       '10000',
    })
    if (cat01) params.set('cdCat01', cat01)
    if (cat02) params.set('cdCat02', cat02)

    const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?${params}`
    const res = await fetch(url, { cache: 'no-store' })
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []
    if (!values.length) console.warn(`[Trade] No data: id=${statsDataId} cat01=${cat01||''} cat02=${cat02||''}`)
    return values
  }

  // Aggregate multiple rows per date into a single value (sum)
  const toSeries = (values) => {
    const map = {}
    for (const v of values) {
      if (!isMonthly(v)) continue
      const date = fmt(v['@time'])
      const val = parseFloat(v['$'])
      if (!isNaN(val)) map[date] = (map[date] ?? 0) + val
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }))
  }

  // Merge main (2021-2025) and current-year (2026) datasets, current year wins
  const merge = (prev, cur) => {
    const map = {}
    prev.forEach(d => { map[d.date] = d })
    cur.forEach(d => { map[d.date] = d })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-24)
  }

  const fetchE = async (cat01, cat02) => {
    const [a, b] = await Promise.all([
      fetchRaw(EXP_MAIN, cat01, cat02).then(toSeries),
      fetchRaw(EXP_CUR,  cat01, cat02).then(toSeries),
    ])
    return merge(a, b)
  }

  const fetchI = async (cat01, cat02) => {
    const [a, b] = await Promise.all([
      fetchRaw(IMP_MAIN, cat01, cat02).then(toSeries),
      fetchRaw(IMP_CUR,  cat01, cat02).then(toSeries),
    ])
    return merge(a, b)
  }

  // Sum multiple monthly series by date
  const sumSeries = (...series) => {
    const map = {}
    for (const s of series) {
      for (const { date, value } of s) {
        map[date] = (map[date] ?? 0) + value
      }
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }))
  }

  const computeNet = (exp, imp) => {
    const impMap = {}
    imp.forEach(v => { impMap[v.date] = v.value })
    return exp.map(v => ({ date: v.date, value: v.value - (impMap[v.date] ?? 0) }))
  }

  // --- Parallel fetch all series ---
  // Total: computed from top-level SITC groups 0-9 (mutually exclusive → no double-count)
  const TOP_CATS = ['0','1','2','3','4','5','6','7','8','9']
  const [
    // Export top-level categories for total
    e0,e1,e2,e3,e4,e5,e6,e7,e8,e9,
    // Import top-level categories for total
    m0,m1,m2,m3,m4,m5,m6,m7,m8,m9,
    // Specific commodity breakdowns
    eAuto, eElec, eMach, eChem,
    iCrude, iLNG, iFood,
    // Country breakdowns
    eUSA, eChina, eKorea,
    iUSA, iChina, iKorea,
  ] = await Promise.all([
    ...TOP_CATS.map(c => fetchE(c, '')),  // 10 export category totals
    ...TOP_CATS.map(c => fetchI(c, '')),  // 10 import category totals
    fetchE('70503', ''),  // 自動車
    fetchE('703',   ''),  // 電気機械（半導体等電子部品含む）
    fetchE('701',   ''),  // 一般機械
    fetchE('5',     ''),  // 化学品 (= e5 above, included again for named access)
    fetchI('303',   ''),  // 原油・石油製品
    fetchI('305',   ''),  // 天然ガス (LNG)
    fetchI('0',     ''),  // 食料品 (= m0 above)
    fetchE('', COUNTRY_CODES.USA),    fetchE('', COUNTRY_CODES.China),   fetchE('', COUNTRY_CODES.Korea),
    fetchI('', COUNTRY_CODES.USA),    fetchI('', COUNTRY_CODES.China),   fetchI('', COUNTRY_CODES.Korea),
  ])

  const expTotal = sumSeries(e0,e1,e2,e3,e4,e5,e6,e7,e8,e9)
  const impTotal = sumSeries(m0,m1,m2,m3,m4,m5,m6,m7,m8,m9)

  const months = expTotal.map(v => v.date)

  return Response.json({
    months,
    export: {
      total:     expTotal,
      auto:      eAuto,
      semicon:   eElec,
      machinery: eMach,
      chemicals: eChem,
    },
    import: {
      total:     impTotal,
      crude_oil: iCrude,
      lng:       iLNG,
      food:      iFood,
    },
    byDest: {
      USA:   { export: eUSA,   import: iUSA,   net: computeNet(eUSA,   iUSA)   },
      China: { export: eChina, import: iChina, net: computeNet(eChina, iChina) },
      Korea: { export: eKorea, import: iKorea, net: computeNet(eKorea, iKorea) },
    }
  })
}
