export const dynamic = 'force-dynamic'

// OECD QNA: Japan quarterly national accounts (real, SA, reference year prices)
const BASE = 'https://stats.oecd.org/SDMX-JSON/data/QNA'
const SUBJECTS = ['B1_GE', 'P31S14_S15', 'P3S13', 'P51', 'P52_P53', 'P6', 'P7']

function parseOECD(json) {
  const dims = json.structure.dimensions.observation
  const dimOrder = dims.map(d => d.id)
  const subjectDim = dims.find(d => d.id === 'SUBJECT')
  const timeDim = dims.find(d => d.id === 'TIME_PERIOD')

  const times = timeDim.values.map(v => v.id)
  const subjectIdx = dimOrder.indexOf('SUBJECT')
  const timeIdx = dimOrder.indexOf('TIME_PERIOD')

  const series = {}
  SUBJECTS.forEach(s => { series[s] = {} })

  for (const [key, val] of Object.entries(json.dataSets[0].observations)) {
    const indices = key.split(':').map(Number)
    const subject = subjectDim.values[indices[subjectIdx]]?.id
    const time = times[indices[timeIdx]]
    const value = val[0]
    if (series[subject] && value !== null && time) {
      series[subject][time] = value
    }
  }

  // Convert to sorted arrays
  const toArr = (s) => {
    const obj = series[s] || {}
    return Object.entries(obj)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }))
  }

  return SUBJECTS.reduce((acc, s) => { acc[s] = toArr(s); return acc }, {})
}

const qoq = (arr) => arr.map((v, i) => {
  if (i === 0) return null
  const prev = arr[i - 1]
  return { date: v.date, value: parseFloat(((v.value - prev.value) / prev.value * 100).toFixed(2)) }
}).filter(Boolean)

const yoy = (arr) => arr.map((v, i) => {
  if (i < 4) return null
  const prev = arr[i - 4]
  return { date: v.date, value: parseFloat(((v.value - prev.value) / prev.value * 100).toFixed(2)) }
}).filter(Boolean)

// Align two arrays by date
function align(a, b) {
  const mapB = Object.fromEntries(b.map(v => [v.date, v.value]))
  return a.map(v => ({ date: v.date, a: v.value, b: mapB[v.date] ?? null }))
    .filter(v => v.b !== null)
}

export async function GET() {
  try {
    const url = `${BASE}/JPN.${SUBJECTS.join('+')}.LNBQRSA.Q/all?format=json&startTime=2015-Q1`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`OECD API ${res.status}`)
    const json = await res.json()

    const raw = parseOECD(json)
    const gdp = raw['B1_GE']
    const cons = raw['P31S14_S15']
    const govt = raw['P3S13']
    const invest = raw['P51']
    const stocks = raw['P52_P53']
    const exp = raw['P6']
    const imp = raw['P7']

    // Contributions to QoQ growth (pp)
    const contributions = gdp.slice(1).map((v, i) => {
      const prevGDP = gdp[i].value
      const contrib = (curr, prev_arr) => {
        const curr_v = curr[i + 1]?.value
        const prev_v = prev_arr[i]?.value
        if (curr_v == null || prev_v == null) return null
        return parseFloat(((curr_v - prev_v) / prevGDP * 100).toFixed(3))
      }
      const exp_v = exp[i + 1]?.value, exp_p = exp[i]?.value
      const imp_v = imp[i + 1]?.value, imp_p = imp[i]?.value
      const net_exp = (exp_v != null && exp_p != null && imp_v != null && imp_p != null)
        ? parseFloat((((exp_v - exp_p) - (imp_v - imp_p)) / prevGDP * 100).toFixed(3))
        : null

      return {
        date: v.date,
        cons:     contrib(cons, cons),
        govt:     contrib(govt, govt),
        invest:   contrib(invest, invest),
        stocks:   contrib(stocks, stocks),
        net_exp,
        gdp_qoq:  parseFloat(((v.value - gdp[i].value) / gdp[i].value * 100).toFixed(2))
      }
    }).filter(v => v.cons !== null)

    // YoY contributions (pp) — approximation via 4-quarter sum of QoQ contribs
    const contrib_yoy = contributions.slice(3).map((v, i) => {
      const window = contributions.slice(i, i + 4)
      const sum = (key) => parseFloat(window.reduce((s, w) => s + (w[key] || 0), 0).toFixed(3))
      return {
        date: v.date,
        cons: sum('cons'), govt: sum('govt'), invest: sum('invest'),
        stocks: sum('stocks'), net_exp: sum('net_exp'), gdp_yoy: sum('gdp_qoq')
      }
    })

    return Response.json({
      gdp_qoq:   qoq(gdp).slice(-20),
      gdp_yoy:   yoy(gdp).slice(-20),
      cons_qoq:  qoq(cons).slice(-20),
      govt_qoq:  qoq(govt).slice(-20),
      invest_qoq: qoq(invest).slice(-20),
      exp_qoq:   qoq(exp).slice(-20),
      imp_qoq:   qoq(imp).slice(-20),
      contributions: contributions.slice(-12),
      contributions_yoy: contrib_yoy.slice(-12),
      levels: {
        gdp: gdp.slice(-20),
        cons: cons.slice(-20),
        invest: invest.slice(-20),
        exp: exp.slice(-20),
        imp: imp.slice(-20),
      }
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
