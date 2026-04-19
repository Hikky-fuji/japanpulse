export const dynamic = 'force-dynamic'

const APP_ID = process.env.ESTAT_APP_ID
const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// Cabinet Office quarterly GDP (2015-base SNA) on e-Stat
// statsDataId: 0003109946
const STATS_ID = '0003109946'

async function fetchMeta() {
  const url = `${BASE}/getMetaInfo?appId=${APP_ID}&statsDataId=${STATS_ID}`
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const result = json?.GET_META_INFO?.RESULT
  if (result?.STATUS !== 0) throw new Error(`e-Stat meta: ${result?.ERROR_MSG}`)
  return json.GET_META_INFO.METADATA_INF
}

async function fetchSeries(cat, tab) {
  const url = `${BASE}/getStatsData`
    + `?appId=${APP_ID}&statsDataId=${STATS_ID}`
    + `&metaGetFlg=N&cdCat01=${cat}&cdTab=${tab}&limit=40`
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE ?? []

  return (Array.isArray(values) ? values : [values])
    .filter(v => v?.['@time'] && v?.['$'])
    .map(v => {
      const t = v['@time']
      // quarterly: 20200100 format (year + '01' + quarter as '01'-'04')
      const year = t.slice(0, 4)
      const q = parseInt(t.slice(6, 8))
      if (!year || q < 1 || q > 4) return null
      return { date: `${year}-Q${q}`, value: parseFloat(v['$']) }
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-24)
}

const qoq = (arr) => arr.map((v, i) => {
  if (i === 0) return null
  return { date: v.date, value: parseFloat(((v.value - arr[i-1].value) / arr[i-1].value * 100).toFixed(2)) }
}).filter(Boolean)

const yoy = (arr) => arr.map((v, i) => {
  if (i < 4) return null
  return { date: v.date, value: parseFloat(((v.value - arr[i-4].value) / arr[i-4].value * 100).toFixed(2)) }
}).filter(Boolean)

export async function GET() {
  try {
    // Discover available categories from metadata
    const meta = await fetchMeta()
    const cats = meta?.CLASS_INF?.CLASS_OBJ ?? []
    const catList = (Array.isArray(cats) ? cats : [cats])
      .find(c => c?.['@id'] === 'cat01')
      ?.CLASS ?? []
    const catArr = Array.isArray(catList) ? catList : [catList]

    // Find category codes by name
    const findCat = (keywords) => {
      const kws = Array.isArray(keywords) ? keywords : [keywords]
      const c = catArr.find(c =>
        kws.every(kw => (c?.['@name'] ?? '').includes(kw))
      )
      return c?.['@code']
    }

    const tabList = (Array.isArray(cats) ? cats : [cats])
      .find(c => c?.['@id'] === 'tab')
      ?.CLASS ?? []
    const tabArr = Array.isArray(tabList) ? tabList : [tabList]

    // Find SA real tab (季節調整済・実質)
    const findTab = (keywords) => {
      const kws = Array.isArray(keywords) ? keywords : [keywords]
      const t = tabArr.find(t =>
        kws.every(kw => (t?.['@name'] ?? '').includes(kw))
      )
      return t?.['@code']
    }

    const catGDP   = findCat(['国内総生産', '支出側']) ?? findCat('国内総生産')
    const catCons  = findCat('民間最終消費支出')
    const catGovt  = findCat('政府最終消費支出')
    const catInv   = findCat('総固定資本形成')
    const catExp   = findCat('財貨・サービスの輸出')
    const catImp   = findCat('財貨・サービスの輸入')
    const tab      = findTab(['実質', '季節調整']) ?? findTab('季節調整')

    if (!catGDP || !tab) throw new Error(`Category not found. GDP:${catGDP} Tab:${tab}. Available: ${catArr.slice(0,5).map(c=>c?.['@name']).join(', ')}`)

    const available = [catCons, catGovt, catInv, catExp, catImp].filter(Boolean)
    const [gdp, ...rest] = await Promise.all([
      fetchSeries(catGDP, tab),
      ...available.map(c => fetchSeries(c, tab))
    ])

    const [cons, govt, invest, exp, imp] = [catCons, catGovt, catInv, catExp, catImp].map((c, i) => {
      if (!c) return []
      const idx = available.indexOf(c)
      return idx >= 0 ? rest[idx] : []
    })

    if (!gdp.length) throw new Error('No GDP data returned from e-Stat')

    const align = (arr) => {
      const map = Object.fromEntries(arr.map(v => [v.date, v.value]))
      return gdp.map(v => ({ date: v.date, value: map[v.date] ?? null }))
    }
    const [consA, govtA, investA, expA, impA] = [cons, govt, invest, exp, imp].map(align)

    const contributions = gdp.slice(1).map((v, i) => {
      const prevGDP = gdp[i].value
      const contrib = (arr) => {
        const cv = arr[i+1]?.value, pv = arr[i]?.value
        return (cv != null && pv != null) ? parseFloat(((cv - pv) / prevGDP * 100).toFixed(3)) : null
      }
      const ev = expA[i+1]?.value, ep = expA[i]?.value
      const mv = impA[i+1]?.value, mp = impA[i]?.value
      const net_exp = (ev!=null&&ep!=null&&mv!=null&&mp!=null)
        ? parseFloat((((ev-ep)-(mv-mp))/prevGDP*100).toFixed(3)) : null
      return {
        date: v.date,
        cons: contrib(consA), govt: contrib(govtA),
        invest: contrib(investA), net_exp,
        gdp_qoq: parseFloat(((v.value-gdp[i].value)/gdp[i].value*100).toFixed(2))
      }
    }).filter(v => v.cons !== null || v.invest !== null)

    const contrib_yoy = contributions.slice(3).map((_, i) => {
      const w = contributions.slice(i, i + 4)
      const sum = (k) => parseFloat(w.reduce((s, x) => s + (x[k] || 0), 0).toFixed(3))
      return {
        date: w[3].date,
        cons: sum('cons'), govt: sum('govt'), invest: sum('invest'),
        net_exp: sum('net_exp'), gdp_yoy: sum('gdp_qoq')
      }
    })

    const clean = (arr) => arr.filter(v => v.value !== null)

    return Response.json({
      gdp_qoq:           qoq(gdp).slice(-20),
      gdp_yoy:           yoy(gdp).slice(-20),
      cons_qoq:          qoq(clean(consA)).slice(-20),
      govt_qoq:          qoq(clean(govtA)).slice(-20),
      invest_qoq:        qoq(clean(investA)).slice(-20),
      exp_qoq:           qoq(clean(expA)).slice(-20),
      imp_qoq:           qoq(clean(impA)).slice(-20),
      contributions:     contributions.slice(-12),
      contributions_yoy: contrib_yoy.slice(-12),
      levels: {
        gdp: gdp.slice(-20),
        cons: clean(consA).slice(-20),
        invest: clean(investA).slice(-20),
      }
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
