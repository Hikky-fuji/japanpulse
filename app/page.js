'use client'
import { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const mma3 = (arr) => arr.map((v, i) => {
  if (i < 2) return null
  return parseFloat(((arr[i-2].value + arr[i-1].value + v.value) / 3).toFixed(2))
})

export default function Home() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/cpi').then(r => r.json()).then(setData)
  }, [])

  if (!data || !data.headline?.length) return (
    <div style={{padding:'40px',fontFamily:'sans-serif',color:'#666'}}>Loading...</div>
  )

  const { headline, core, corecore, services, headline_mm, core_mm, corecore_mm, services_mm } = data

  const latest = { headline: headline.at(-1), core: core.at(-1), corecore: corecore.at(-1), services: services?.at(-1) }
  const prev   = { headline: headline.at(-2), core: core.at(-2), corecore: corecore.at(-2), services: services?.at(-2) }

  const diff = (a, b) => {
    if (!a || !b) return { str: 'N/A', pos: true }
    const d = (a.value - b.value).toFixed(1)
    return { str: Number(d) > 0 ? `+${d}pp` : `${d}pp`, pos: Number(d) >= 0 }
  }

  const labels = headline.map(v => v.date)
  const core3mma = mma3(core)
  const services3mma = mma3(services || [])

  // Chart 1: Headline / Core / Core-Core Y/Y
  const chart1 = {
    labels,
    datasets: [
      { label: 'Headline', data: headline.map(v=>v.value), borderColor:'#378ADD', borderWidth:2, pointRadius:0, tension:0.3 },
      { label: 'Core', data: core.map(v=>v.value), borderColor:'#D85A30', borderWidth:2, pointRadius:0, tension:0.3 },
      { label: 'Core-Core', data: corecore.map(v=>v.value), borderColor:'#1D9E75', borderWidth:2, pointRadius:0, tension:0.3 },
    ]
  }

  // Chart 2: Services + 3MMA
  const chart2 = {
    labels,
    datasets: [
      { label: 'Services (ex. Imputed Rent)', data: (services||[]).map(v=>v.value), borderColor:'#D85A30', borderWidth:2, pointRadius:3, tension:0.3 },
      { label: 'Services 3MMA', data: services3mma, borderColor:'#1D9E75', borderWidth:2, pointRadius:0, tension:0.3, borderDash:[4,2] },
      { label: 'Core-Core', data: corecore.map(v=>v.value), borderColor:'#888', borderWidth:1.5, pointRadius:0, tension:0.3 },
      { label: 'Core 3MMA', data: core3mma, borderColor:'#378ADD', borderWidth:2, pointRadius:0, tension:0.3, borderDash:[4,2] },
    ]
  }

  // Chart 3: M/M bar chart
  const mmLabels = (headline_mm||[]).slice(-12).map(v=>v.date)
  const chart3 = {
    labels: mmLabels,
    datasets: [
      { label: 'Headline M/M', data: (headline_mm||[]).slice(-12).map(v=>v.value), backgroundColor: (headline_mm||[]).slice(-12).map(v=>v.value>=0?'rgba(55,138,221,0.7)':'rgba(232,74,74,0.7)'), borderRadius:3 },
      { label: 'Core M/M', data: (core_mm||[]).slice(-12).map(v=>v.value), backgroundColor: (core_mm||[]).slice(-12).map(v=>v.value>=0?'rgba(29,158,117,0.7)':'rgba(232,74,74,0.7)'), borderRadius:3 },
    ]
  }

  const lineOpts = { responsive:true, plugins:{ legend:{ position:'top' }, tooltip:{ mode:'index', intersect:false } }, scales:{ y:{ ticks:{ callback: v => v.toFixed(1)+'%' } } } }
  const barOpts  = { responsive:true, plugins:{ legend:{ position:'top' }, tooltip:{ mode:'index', intersect:false } }, scales:{ y:{ ticks:{ callback: v => v.toFixed(2)+'%' } } } }

  const cards = [
    { label:'Headline (Y/Y)', val:latest.headline?.value, d:diff(latest.headline, prev.headline) },
    { label:'Core ex. Fresh Food', val:latest.core?.value, d:diff(latest.core, prev.core) },
    { label:'Core-Core ex. Food & Energy', val:latest.corecore?.value, d:diff(latest.corecore, prev.corecore) },
    { label:'Services ex. Imputed Rent', val:latest.services?.value, d:diff(latest.services, prev.services) },
  ]

  const mmRows = [
    { label:'Headline', mm: headline_mm },
    { label:'Core', mm: core_mm },
    { label:'Core-Core', mm: corecore_mm },
    { label:'Services', mm: services_mm },
  ]
  const mmMonths = (headline_mm||[]).slice(-3).map(v=>v.date)

  const s = {
    wrap: { maxWidth:'960px', margin:'0 auto', padding:'24px', fontFamily:'sans-serif' },
    header: { display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'12px' },
    grid4: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px' },
    card: { background:'#f8f8f6', borderRadius:'10px', padding:'14px 16px' },
    cardLabel: { fontSize:'10px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' },
    cardVal: { fontSize:'22px', fontWeight:'600', color:'#111' },
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' },
    box: { background:'#fff', border:'1px solid #eee', borderRadius:'12px', padding:'16px', marginBottom:'16px' },
    boxTitle: { fontSize:'13px', fontWeight:'500', marginBottom:'12px', color:'#333' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:'13px' },
    th: { textAlign:'right', padding:'6px 10px', color:'#888', fontWeight:'500', borderBottom:'1px solid #eee' },
    td: { padding:'6px 10px', borderBottom:'1px solid #f5f5f5' },
  }

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <h1 style={{fontSize:'20px',fontWeight:'600',color:'#111'}}>Japan CPI Dashboard</h1>
        <span style={{fontSize:'12px',color:'#888'}}>Source: MIC e-Stat / Auto-updated monthly</span>
      </div>

      {/* KPI Cards */}
      <div style={s.grid4}>
        {cards.map(k => (
          <div key={k.label} style={s.card}>
            <div style={s.cardLabel}>{k.label}</div>
            <div style={s.cardVal}>{k.val != null ? k.val.toFixed(1)+'%' : '--'}</div>
            <div style={{fontSize:'11px', color: k.d.pos?'#1D9E75':'#E24B4A', marginTop:'3px'}}>{k.d.str} vs prior</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Headline / Core / Core-Core (Y/Y %)</div>
          <Line data={chart1} options={lineOpts} />
        </div>
        <div style={s.box}>
          <div style={s.boxTitle}>Services & Core — 3MMA Stickiness Check (Y/Y %)</div>
          <Line data={chart2} options={lineOpts} />
        </div>
      </div>

      {/* M/M bar chart */}
      <div style={s.box}>
        <div style={s.boxTitle}>Month-over-Month (M/M %) — Last 12 months</div>
        <Bar data={chart3} options={barOpts} />
      </div>

      {/* M/M highlight table */}
      <div style={s.box}>
        <div style={s.boxTitle}>M/M Highlight — Last 3 months</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{...s.th, textAlign:'left'}}>Series</th>
              {mmMonths.map(m => <th key={m} style={s.th}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {mmRows.map(row => (
              <tr key={row.label}>
                <td style={{...s.td, fontWeight:'500'}}>{row.label}</td>
                {(row.mm||[]).slice(-3).map(v => (
                  <td key={v.date} style={{...s.td, textAlign:'right', color: v.value>0?'#1D9E75': v.value<0?'#E24B4A':'#888', fontWeight:'500'}}>
                    {v.value > 0 ? '+' : ''}{v.value.toFixed(2)}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
