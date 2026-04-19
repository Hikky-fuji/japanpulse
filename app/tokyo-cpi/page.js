'use client'
import React, { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const mma3 = (arr) => arr.map((v, i) => {
  if (i < 2) return null
  return parseFloat(((arr[i-2].value + arr[i-1].value + v.value) / 3).toFixed(2))
})

export default function TokyoCPI() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/tokyo-cpi').then(r => r.json()).then(setData)
  }, [])

  if (!data || !data.headline?.length) return (
    <div style={{padding:'40px',fontFamily:'sans-serif',color:'#666'}}>Loading...</div>
  )

  const { headline, core, corecore, services, headline_mm, core_mm, corecore_mm, services_mm } = data

  const latest = {
    headline: headline.at(-1), core: core.at(-1),
    corecore: corecore.at(-1), services: services?.at(-1)
  }
  const prev = {
    headline: headline.at(-2), core: core.at(-2),
    corecore: corecore.at(-2), services: services?.at(-2)
  }
  const diff = (a, b) => {
    if (!a || !b) return { str: 'N/A', pos: true }
    const d = (a.value - b.value).toFixed(1)
    return { str: Number(d) > 0 ? `+${d}pp` : `${d}pp`, pos: Number(d) >= 0 }
  }

  const labels = headline.map(v => v.date)
  const core3mma = mma3(core)
  const services3mma = mma3(services || [])

  const chart1 = {
    labels,
    datasets: [
      { label: 'Headline', data: headline.map(v=>v.value), borderColor:'#378ADD', borderWidth:2, pointRadius:0, tension:0.3 },
      { label: 'Core', data: core.map(v=>v.value), borderColor:'#D85A30', borderWidth:2, pointRadius:0, tension:0.3 },
      { label: 'Core-Core', data: corecore.map(v=>v.value), borderColor:'#1D9E75', borderWidth:2, pointRadius:0, tension:0.3 },
    ]
  }

  const chart2 = {
    labels,
    datasets: [
      { label: 'Services (ex. Imputed Rent)', data: (services||[]).map(v=>v.value), borderColor:'#D85A30', borderWidth:2, pointRadius:3, tension:0.3 },
      { label: 'Services 3MMA', data: services3mma, borderColor:'#D85A30', borderWidth:1.5, pointRadius:0, tension:0.3, borderDash:[4,3] },
      { label: 'Core-Core', data: corecore.map(v=>v.value), borderColor:'#888', borderWidth:1.5, pointRadius:0, tension:0.3 },
      { label: 'Core 3MMA', data: core3mma, borderColor:'#378ADD', borderWidth:1.5, pointRadius:0, tension:0.3, borderDash:[4,3] },
    ]
  }

  const mmMonths = (headline_mm||[]).slice(-3).map(v=>v.date)
  const mmColor = (v) => v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'

  const mmRows = [
    { label:'Headline',                 mm: headline_mm  },
    { label:'Core (ex. Fresh Food)',    mm: core_mm      },
    { label:'Core-Core',                mm: corecore_mm  },
    { label:'Services (ex. Imp. Rent)', mm: services_mm  },
  ]

  const lineOpts = {
    responsive: true,
    plugins: { legend:{ position:'top' }, tooltip:{ mode:'index', intersect:false } },
    scales: { y:{ ticks:{ callback: v => v.toFixed(1)+'%' } } }
  }

  const cards = [
    { label:'Headline (Y/Y)',              val:latest.headline?.value,  d:diff(latest.headline,  prev.headline)  },
    { label:'Core ex. Fresh Food',         val:latest.core?.value,      d:diff(latest.core,      prev.core)      },
    { label:'Core-Core ex. Food & Energy', val:latest.corecore?.value,  d:diff(latest.corecore,  prev.corecore)  },
    { label:'Services ex. Imputed Rent',   val:latest.services?.value,  d:diff(latest.services,  prev.services)  },
  ]

  const s = {
    wrap:      { maxWidth:'980px', margin:'0 auto', padding:'24px', fontFamily:'sans-serif' },
    header:    { display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'12px' },
    nav:       { fontSize:'12px', color:'#378ADD', textDecoration:'none', marginRight:'16px' },
    grid4:     { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' },
    card:      { background:'#f8f8f6', borderRadius:'10px', padding:'14px 16px' },
    cardLabel: { fontSize:'10px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' },
    cardVal:   { fontSize:'22px', fontWeight:'600', color:'#111' },
    grid2:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' },
    box:       { background:'#fff', border:'1px solid #eee', borderRadius:'12px', padding:'16px', marginBottom:'16px' },
    boxTitle:  { fontSize:'13px', fontWeight:'500', marginBottom:'12px', color:'#333' },
    badge:     { display:'inline-block', fontSize:'10px', background:'#FFF3CD', color:'#856404', borderRadius:'4px', padding:'2px 7px', marginLeft:'8px', fontWeight:'600' },
    table:     { width:'100%', borderCollapse:'collapse', fontSize:'12.5px' },
    th:        { textAlign:'right', padding:'7px 12px', color:'#888', fontWeight:'500', borderBottom:'1px solid #eee' },
    td:        { padding:'6px 12px', borderBottom:'1px solid #f5f5f5' },
  }

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <span style={{fontSize:'20px',fontWeight:'600',color:'#111'}}>
            Tokyo CPI Dashboard
            <span style={s.badge}>Leading Indicator</span>
          </span>
        </div>
        <span style={{fontSize:'12px',color:'#888'}}>Source: MIC e-Stat / Tokyo-ku, ~3 weeks ahead of national</span>
      </div>

      <div style={s.grid4}>
        {cards.map(k => (
          <div key={k.label} style={s.card}>
            <div style={s.cardLabel}>{k.label}</div>
            <div style={s.cardVal}>{k.val != null ? k.val.toFixed(1)+'%' : '--'}</div>
            <div style={{fontSize:'11px', color: k.d.pos?'#1D9E75':'#E24B4A', marginTop:'3px'}}>{k.d.str} vs prior</div>
          </div>
        ))}
      </div>

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

      <div style={s.box}>
        <div style={s.boxTitle}>M/M Highlight — Last 3 months (NSA, not seasonally adjusted)</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{...s.th, textAlign:'left', width:'220px'}}>Series</th>
              {mmMonths.map(m => <th key={m} style={s.th}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {mmRows.map(row => (
              <tr key={row.label}>
                <td style={s.td}>{row.label}</td>
                {(row.mm||[]).slice(-3).map(v => (
                  <td key={v.date} style={{...s.td, textAlign:'right', color:mmColor(v.value), fontWeight:'500'}}>
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
