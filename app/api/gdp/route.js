export const dynamic = 'force-dynamic'

const BASE = 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.NAD,DSD_NAMAIN1@DF_QNA'

// Expected ACTIVITY/EXPENDITURE per series (confirmed from OECD metadata)
const SERIES_FILTER = {
  'S1/B1GQ':  { act: '_Z', exp: '_Z' },
  'S1/B11':   { act: '_Z', exp: '_Z' },
  'S1/P51G':  { act: '_T', exp: '_Z' },
  'S1/P52':   { act: '_T', exp: '_Z' },
  'S1M/P3':   { act: '_Z', exp: '_T' },
  'S13/P3':   { act: '_Z', exp: '_T' },
}

function parseSDMX(json) {
  const structs = json.data.structures[0]
  const seriesDims = structs.dimensions.series
  const times = structs.dimensions.observation[0].values.map(v => v.id)

  const di = Object.fromEntries(seriesDims.map((d, i) => [d.id, i]))
  const gv = (id, idx) => seriesDims[di[id]].values[idx].id

  const series = {}
  for (const [key, val] of Object.entries(json.data.dataSets[0].series || {})) {
    const idxs = key.split(':').map(Number)
    const sec = gv('SECTOR', idxs[di['SECTOR']])
    const tx  = gv('TRANSACTION', idxs[di['TRANSACTION']])
    const ia  = gv('INSTR_ASSET', idxs[di['INSTR_ASSET']])
    const act = gv('ACTIVITY', idxs[di['ACTIVITY']])
    const exp = gv('EXPENDITURE', idxs[di['EXPENDITURE']])
    const k   = `${sec}/${tx}`

    const filter = SERIES_FILTER[k]
    if (!filter || ia !== '_Z' || act !== filter.act || exp !== filter.exp) continue
    if (!series[k]) series[k] = {}

    for (const [ti, obs] of Object.entries(val.observations || {})) {
      const date = times[Number(ti)]
      const v = obs[0]
      if (date && v !== null && !(date in series[k])) series[k][date] = v
    }
  }

  return (k) => Object.entries(series[k] || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }))
}

async function fetchOECD(dims, start = '2015-Q1') {
  const url = `${BASE}/${dims}?startPeriod=${start}&format=jsondata`
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
  })
  if (!res.ok) throw new Error(`OECD ${res.status}: ${dims.slice(0, 60)}`)
  const json = await res.json()
  return parseSDMX(json)
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
    // Sequential to surface exact error per request
    const toArr1 = await fetchOECD('Q.Y.JPN.S1.S1.B1GQ+B11._Z._Z._Z.XDC.V.N.T0102')
    const toArr2 = await fetchOECD('Q.Y.JPN.S1.S1.P51G+P52._Z._T._Z.XDC.V.N.T0102')
    const toArr3 = await fetchOECD('Q.Y.JPN.S1M.S1.P3._Z._Z._T.XDC.V.N.T0102').catch(() => () => [])
    const toArr4 = await fetchOECD('Q.Y.JPN.S13.S1.P3._Z._Z._T.XDC.V.N.T0102').catch(() => () => [])

    const gdp    = toArr1('S1/B1GQ')
    const netexp = toArr1('S1/B11')
    const invest = toArr2('S1/P51G')
    const stocks = toArr2('S1/P52')
    const cons   = toArr3('S1M/P3')   // Households + NPISH
    const govt   = toArr4('S13/P3')   // Government consumption

    if (!gdp.length) throw new Error('No GDP data from OECD')

    // Align all series to GDP date range
    const align = (arr) => {
      const map = Object.fromEntries(arr.map(v => [v.date, v.value]))
      return gdp.map(v => ({ date: v.date, value: map[v.date] ?? null }))
    }
    const [consA, govtA, investA, stocksA, netexpA] =
      [cons, govt, invest, stocks, netexp].map(align)

    // Contributions to QoQ growth (pp) = Δcomponent / prev_GDP × 100
    const contributions = gdp.slice(1).map((v, i) => {
      const prevGDP = gdp[i].value
      const contrib = (arr) => {
        const cv = arr[i+1]?.value, pv = arr[i]?.value
        return (cv != null && pv != null) ? parseFloat(((cv - pv) / prevGDP * 100).toFixed(3)) : null
      }
      return {
        date:    v.date,
        cons:    contrib(consA),
        govt:    contrib(govtA),
        invest:  contrib(investA),
        stocks:  contrib(stocksA),
        net_exp: contrib(netexpA),
        gdp_qoq: parseFloat(((v.value - gdp[i].value) / gdp[i].value * 100).toFixed(2))
      }
    }).filter(v => v.cons !== null || v.invest !== null)

    // YoY contributions — rolling 4-quarter sum of QoQ contribs
    const contrib_yoy = contributions.slice(3).map((_, i) => {
      const w = contributions.slice(i, i + 4)
      const sum = (k) => parseFloat(w.reduce((s, x) => s + (x[k] || 0), 0).toFixed(3))
      return {
        date: w[3].date,
        cons: sum('cons'), govt: sum('govt'), invest: sum('invest'),
        stocks: sum('stocks'), net_exp: sum('net_exp'), gdp_yoy: sum('gdp_qoq')
      }
    })

    const clean = (arr) => arr.filter(v => v.value !== null)

    return Response.json({
      gdp_qoq:           qoq(gdp).slice(-20),
      gdp_yoy:           yoy(gdp).slice(-20),
      cons_qoq:          qoq(clean(consA)).slice(-20),
      govt_qoq:          qoq(clean(govtA)).slice(-20),
      invest_qoq:        qoq(clean(investA)).slice(-20),
      contributions:     contributions.slice(-12),
      contributions_yoy: contrib_yoy.slice(-12),
      levels: {
        gdp:    gdp.slice(-20),
        cons:   cons.slice(-20),
        invest: invest.slice(-20),
      }
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
