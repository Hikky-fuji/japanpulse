'use client'
import React, { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend
} from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const COLORS = {
  cons:     'rgba(55,138,221,0.85)',
  govt:     'rgba(29,158,117,0.85)',
  invest:   'rgba(245,166,35,0.85)',
  stocks:   'rgba(155,89,182,0.85)',
  net_exp:  'rgba(232,74,74,0.85)',
  gdp_line: '#111',
}

const fmt1 = (v) => v != null ? (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)) + '%' : '--'
const fmt2 = (v) => v != null ? (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) + '%' : '--'
const fmtPP = (v) => v != null ? (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) + 'pp' : '--'



export default function GDPPage() {
  const [data, setData] = useState(null)
  const [view, setView] = useState('qoq') // 'qoq' | 'yoy'

  useEffect(() => { fetch('/api/gdp').then(r => r.json()).then(setData) }, [])

  if (!data) return <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading GDP data...</div>
  if (data.error) return <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#c00' }}>Error: {data.error}</div>

  const { gdp_qoq, gdp_yoy, cons_qoq, govt_qoq, invest_qoq, exp_qoq, imp_qoq, contributions, contributions_yoy, levels } = data

  const latestQoQ = gdp_qoq?.at(-1)
  const prevQoQ   = gdp_qoq?.at(-2)
  const latestYoY = gdp_yoy?.at(-1)
  const prevYoY   = gdp_yoy?.at(-2)
  const latestCons = cons_qoq?.at(-1)
  const latestInv  = invest_qoq?.at(-1)

  const diff = (a, b) => {
    if (!a || !b) return { str: 'N/A', pos: true }
    const d = (a.value - b.value).toFixed(2)
    return { str: Number(d) > 0 ? `+${d}pp` : `${d}pp`, pos: Number(d) >= 0 }
  }

  const cards = [
    { label: 'Real GDP (Y/Y)', val: latestYoY?.value, d: diff(latestYoY, prevYoY), period: latestYoY?.date },
    { label: 'Real GDP (Q/Q SA)', val: latestQoQ?.value, d: diff(latestQoQ, prevQoQ), period: latestQoQ?.date },
    { label: 'Private Consumption (Q/Q)', val: latestCons?.value, d: diff(latestCons, cons_qoq?.at(-2)), period: latestCons?.date },
    { label: 'Fixed Investment (Q/Q)', val: latestInv?.value, d: diff(latestInv, invest_qoq?.at(-2)), period: latestInv?.date },
  ]

  // Growth history chart
  const growthChart = {
    labels: gdp_yoy?.map(v => v.date) || [],
    datasets: [
      { label: 'GDP Y/Y', data: gdp_yoy?.map(v => v.value), borderColor: '#378ADD', borderWidth: 2.5, pointRadius: 2, tension: 0.3, fill: false },
      { label: 'GDP Q/Q (SA)', data: (() => {
        const mapQ = Object.fromEntries((gdp_qoq || []).map(v => [v.date, v.value]))
        return (gdp_yoy || []).map(v => mapQ[v.date] ?? null)
      })(), borderColor: '#D85A30', borderWidth: 1.5, pointRadius: 2, tension: 0.3, borderDash: [4, 3], fill: false },
    ]
  }

  // Contribution chart (QoQ or YoY)
  const contribs = view === 'qoq' ? contributions : contributions_yoy
  const contribLabels = (contribs || []).map(v => v.date)
  const contribChart = {
    labels: contribLabels,
    datasets: [
      { label: 'Private Consumption', data: (contribs || []).map(v => v.cons), backgroundColor: COLORS.cons, stack: 'c' },
      { label: 'Government Consumption', data: (contribs || []).map(v => v.govt), backgroundColor: COLORS.govt, stack: 'c' },
      { label: 'Fixed Investment', data: (contribs || []).map(v => v.invest), backgroundColor: COLORS.invest, stack: 'c' },
      { label: 'Inventory Change', data: (contribs || []).map(v => v.stocks), backgroundColor: COLORS.stocks, stack: 'c' },
      { label: 'Net Exports', data: (contribs || []).map(v => v.net_exp), backgroundColor: COLORS.net_exp, stack: 'c' },
      {
        label: view === 'qoq' ? 'GDP Q/Q' : 'GDP Y/Y',
        data: (contribs || []).map(v => view === 'qoq' ? v.gdp_qoq : v.gdp_yoy),
        type: 'line', borderColor: '#111', borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#111',
        tension: 0.2, borderDash: [3, 2], fill: false,
      },
    ]
  }

  // Components growth chart (last 8Q)
  const compLabels = (gdp_qoq || []).slice(-8).map(v => v.date)
  const sliceLast = (arr) => (arr || []).slice(-8).map(v => v.value)
  const componentChart = {
    labels: compLabels,
    datasets: [
      { label: 'GDP', data: sliceLast(gdp_qoq), backgroundColor: 'rgba(55,138,221,0.7)', borderColor: '#378ADD', borderWidth: 1 },
      { label: 'Private Consumption', data: sliceLast(cons_qoq), backgroundColor: 'rgba(29,158,117,0.7)', borderColor: '#1D9E75', borderWidth: 1 },
      { label: 'Govt Consumption', data: sliceLast(govt_qoq), backgroundColor: 'rgba(155,89,182,0.6)', borderColor: '#9B59B6', borderWidth: 1 },
      { label: 'Fixed Investment', data: sliceLast(invest_qoq), backgroundColor: 'rgba(245,166,35,0.7)', borderColor: '#F5A623', borderWidth: 1 },
      { label: 'Exports', data: sliceLast(exp_qoq), backgroundColor: 'rgba(232,74,74,0.6)', borderColor: '#E24B4A', borderWidth: 1 },
      { label: 'Imports (neg=drag)', data: (imp_qoq || []).slice(-8).map(v => -v.value), backgroundColor: 'rgba(180,180,180,0.6)', borderColor: '#aaa', borderWidth: 1 },
    ]
  }

  // Levels chart (indexed, 2019Q4=100)
  const buildIndex = (arr, baseDate = '2019-Q4') => {
    const base = arr?.find(v => v.date === baseDate)?.value
    if (!base) return arr?.map(v => ({ date: v.date, value: null })) ?? []
    return arr?.map(v => ({ date: v.date, value: parseFloat((v.value / base * 100).toFixed(1)) })) ?? []
  }
  const gdpIdx    = buildIndex(levels?.gdp)
  const consIdx   = buildIndex(levels?.cons)
  const investIdx = buildIndex(levels?.invest)
  const expIdx    = buildIndex(levels?.exp)
  const impIdx    = buildIndex(levels?.imp)
  const idxLabels = gdpIdx.map(v => v.date)
  const levelChart = {
    labels: idxLabels,
    datasets: [
      { label: 'GDP', data: gdpIdx.map(v => v.value), borderColor: '#378ADD', borderWidth: 2.5, pointRadius: 0, tension: 0.3 },
      { label: 'Private Consumption', data: consIdx.map(v => v.value), borderColor: '#1D9E75', borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
      { label: 'Fixed Investment', data: investIdx.map(v => v.value), borderColor: '#F5A623', borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
      { label: 'Exports', data: expIdx.map(v => v.value), borderColor: '#E24B4A', borderWidth: 1.5, pointRadius: 0, tension: 0.3, borderDash: [4, 3] },
      { label: 'Imports', data: impIdx.map(v => v.value), borderColor: '#aaa', borderWidth: 1.5, pointRadius: 0, tension: 0.3, borderDash: [4, 3] },
    ]
  }

  const lineOpts = (yLabel = '%') => ({
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: { y: { ticks: { callback: v => v.toFixed(1) + yLabel } } }
  })
  const contribOpts = {
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, ticks: { callback: v => v.toFixed(1) + 'pp' } }
    }
  }
  const barOpts = {
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: { y: { ticks: { callback: v => v.toFixed(1) + '%' } } }
  }

  const s = {
    wrap:     { maxWidth: '1060px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' },
    grid4:    { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' },
    card:     { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLbl:  { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:  { fontSize: '22px', fontWeight: '600', color: '#111' },
    cardPer:  { fontSize: '10px', color: '#bbb', marginTop: '2px' },
    grid2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    box:      { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
    boxTitle: { fontSize: '13px', fontWeight: '500', color: '#333' },
    toggle:   { display: 'flex', gap: '6px' },
    toggleBtn:(active) => ({
      fontSize: '11px', padding: '3px 10px', borderRadius: '6px', cursor: 'pointer', border: 'none',
      background: active ? '#378ADD' : '#f0f0f0', color: active ? '#fff' : '#555',
    }),
    note:     { fontSize: '10px', color: '#bbb', marginTop: '8px' },
  }

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>Japan GDP Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="/" style={{ fontSize: '12px', color: '#378ADD', textDecoration: 'none' }}>CPI →</a>
          <a href="/consumption" style={{ fontSize: '12px', color: '#9B59B6', textDecoration: 'none' }}>Consumption →</a>
          <a href="/ppi" style={{ fontSize: '12px', color: '#D85A30', textDecoration: 'none' }}>PPI →</a>
          <span style={{ fontSize: '12px', color: '#888' }}>Source: OECD QNA / Real SA, Reference Year Prices</span>
        </div>
      </div>

      <div style={s.grid4}>
        {cards.map(k => (
          <div key={k.label} style={s.card}>
            <div style={s.cardLbl}>{k.label}</div>
            <div style={s.cardVal}>{k.val != null ? fmt1(k.val) : '--'}</div>
            <div style={{ fontSize: '11px', color: k.d.pos ? '#1D9E75' : '#E24B4A', marginTop: '3px' }}>{k.d.str} vs prior</div>
            <div style={s.cardPer}>{k.period}</div>
          </div>
        ))}
      </div>

      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Real GDP Growth — Y/Y and Q/Q SA (%)</div>
          <Line data={growthChart} options={lineOpts('%')} />
          <div style={s.note}>Shaded = recessions. Q/Q dashed.</div>
        </div>

        <div style={s.box}>
          <div style={s.boxTop}>
            <div style={s.boxTitle}>
              GDP Contribution to {view === 'qoq' ? 'Q/Q SA' : 'Y/Y'} Growth (pp)
            </div>
            <div style={s.toggle}>
              <button style={s.toggleBtn(view === 'qoq')} onClick={() => setView('qoq')}>Q/Q</button>
              <button style={s.toggleBtn(view === 'yoy')} onClick={() => setView('yoy')}>Y/Y</button>
            </div>
          </div>
          <Bar data={contribChart} options={contribOpts} />
          <div style={s.note}>Net Exports = Exports − Imports contribution. Inventory = stock changes.</div>
        </div>
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>GDP Component Growth Q/Q SA (%) — Last 8 Quarters</div>
        <Bar data={componentChart} options={barOpts} />
        <div style={s.note}>Imports inverted: negative bar = import drag on GDP.</div>
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>GDP Components — Volume Index (2019-Q4 = 100, SA)</div>
        <Line data={levelChart} options={lineOpts('')} />
        <div style={s.note}>Indexed to pre-COVID level. Divergence shows structural demand shifts.</div>
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>Quarterly Detail Table — Latest 8Q (Q/Q SA %)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
          <thead>
            <tr>
              {['Quarter', 'GDP', 'Pvt Cons', 'Govt Cons', 'Fixed Inv', 'Exports', 'Imports'].map(h => (
                <th key={h} style={{ textAlign: h === 'Quarter' ? 'left' : 'right', padding: '7px 12px', color: '#888', fontWeight: '500', borderBottom: '1px solid #eee' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(gdp_qoq || []).slice(-8).map((v, i) => {
              const row = [
                cons_qoq?.at(-(8 - i))?.value,
                govt_qoq?.at(-(8 - i))?.value,
                invest_qoq?.at(-(8 - i))?.value,
                exp_qoq?.at(-(8 - i))?.value,
                imp_qoq?.at(-(8 - i))?.value,
              ]
              const color = (val) => val == null ? '#888' : val > 0 ? '#1D9E75' : val < 0 ? '#E24B4A' : '#888'
              return (
                <tr key={v.date}>
                  <td style={{ padding: '6px 12px', borderBottom: '1px solid #f5f5f5', fontWeight: '500' }}>{v.date}</td>
                  <td style={{ padding: '6px 12px', borderBottom: '1px solid #f5f5f5', textAlign: 'right', color: color(v.value), fontWeight: '600' }}>{fmt2(v.value)}</td>
                  {row.map((val, j) => (
                    <td key={j} style={{ padding: '6px 12px', borderBottom: '1px solid #f5f5f5', textAlign: 'right', color: color(val) }}>{fmt2(val)}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
