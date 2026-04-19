'use client'
import React, { useEffect, useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

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

  const {
    headline, core, corecore, services,
    headline_mm, core_mm, corecore_mm, services_mm,
    food_mm, energy_mm, goods_mm, housing_mm, medical_mm,
    transport_mm, education_mm, comms_mm, leisure_mm, eating_out_mm, apparel_mm, furniture_mm,
    contrib
  } = data

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

  const contribLabels = (contrib?.food_ex_fresh||[]).slice(-12).map(v=>v.date)
  const chart3 = {
    labels: contribLabels,
    datasets: [
      { label: 'Food (ex. Fresh)', data: (contrib?.food_ex_fresh||[]).slice(-12).map(v=>v.value), backgroundColor:'rgba(55,138,221,0.8)', stack:'contrib' },
      { label: 'Energy', data: (contrib?.energy||[]).slice(-12).map(v=>v.value), backgroundColor:'rgba(232,74,74,0.8)', stack:'contrib' },
      { label: 'Goods (ex. Food & Energy)', data: (contrib?.goods_ex_food_energy||[]).slice(-12).map(v=>v.value), backgroundColor:'rgba(29,158,117,0.8)', stack:'contrib' },
      { label: 'Services', data: (contrib?.services||[]).slice(-12).map(v=>v.value), backgroundColor:'rgba(255,165,0,0.8)', stack:'contrib' },
      { label: 'Headline (Y/Y)', data: headline.slice(-12).map(v=>v.value), type:'line', borderColor:'#333', borderWidth:1.5, pointRadius:3, tension:0.3, borderDash:[3,2] },
    ]
  }

  // ウェート円グラフ（2020年基準、総合1000分比）
  const weightData = {
    labels: [
      'Housing (住居) 16%',
      'Food ex. Fresh (食料) 22%',
      'Transport & Comms (交通通信) 14%',
      'Services ex. Rent (サービス) 11%',
      'Leisure & Education (教養教育) 9%',
      'Energy (光熱) 7%',
      'Goods ex. Food & Energy (財) 8%',
      'Medical (保健医療) 5%',
      'Apparel (被服) 4%',
      'Other 4%',
    ],
    datasets: [{
      data: [160, 219, 143, 110, 90, 72, 80, 50, 41, 35],
      backgroundColor: [
        '#378ADD', '#D85A30', '#1D9E75', '#F5A623',
        '#9B59B6', '#E24B4A', '#2ECC71', '#1ABC9C',
        '#E67E22', '#95A5A6',
      ],
      borderWidth: 1,
      borderColor: '#fff',
    }]
  }

  const lineOpts = {
    responsive: true,
    plugins: { legend:{ position:'top' }, tooltip:{ mode:'index', intersect:false } },
    scales: { y:{ ticks:{ callback: v => v.toFixed(1)+'%' } } }
  }
  const contribOpts = {
    responsive: true,
    plugins: { legend:{ position:'top' }, tooltip:{ mode:'index', intersect:false } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, ticks:{ callback: v => v.toFixed(1)+'pp' } }
    }
  }
  const doughnutOpts = {
    responsive: true,
    plugins: {
      legend: { position: 'right', labels: { font: { size: 11 }, padding: 12 } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}/1000` } }
    }
  }

  const cards = [
    { label:'Headline (Y/Y)', val:latest.headline?.value, d:diff(latest.headline, prev.headline) },
    { label:'Core ex. Fresh Food', val:latest.core?.value, d:diff(latest.core, prev.core) },
    { label:'Core-Core ex. Food & Energy', val:latest.corecore?.value, d:diff(latest.corecore, prev.corecore) },
    { label:'Services ex. Imputed Rent', val:latest.services?.value, d:diff(latest.services, prev.services) },
  ]

  const mmRows = [
    { label:'Headline',                  mm: headline_mm,   group: 'Aggregate' },
    { label:'Core (ex. Fresh Food)',     mm: core_mm,       group: 'Aggregate' },
    { label:'Core-Core',                 mm: corecore_mm,   group: 'Aggregate' },
    { label:'Services (ex. Imp. Rent)',  mm: services_mm,   group: 'Aggregate' },
    { label:'Food (ex. Fresh)',          mm: food_mm,       group: 'Goods' },
    { label:'Energy',                    mm: energy_mm,     group: 'Goods' },
    { label:'Goods (ex. Food & Energy)', mm: goods_mm,      group: 'Goods' },
    { label:'Furniture & Household',     mm: furniture_mm,  group: 'Goods' },
    { label:'Apparel & Footwear',        mm: apparel_mm,    group: 'Goods' },
    { label:'Housing',                   mm: housing_mm,    group: 'Services' },
    { label:'Medical & Healthcare',      mm: medical_mm,    group: 'Services' },
    { label:'Transport',                 mm: transport_mm,  group: 'Services' },
    { label:'Communications',            mm: comms_mm,      group: 'Services' },
    { label:'Education',                 mm: education_mm,  group: 'Services' },
    { label:'Leisure & Culture',         mm: leisure_mm,    group: 'Services' },
    { label:'Eating Out',                mm: eating_out_mm, group: 'Services' },
  ]
  const mmMonths = (headline_mm||[]).slice(-3).map(v=>v.date)
  const mmColor = (v) => v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'

  const s = {
    wrap: { maxWidth:'980px', margin:'0 auto', padding:'24px', fontFamily:'sans-serif' },
    header: { display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'12px' },
    grid4: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'20px' },
    card: { background:'#f8f8f6', borderRadius:'10px', padding:'14px 16px' },
    cardLabel: { fontSize:'10px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' },
    cardVal: { fontSize:'22px', fontWeight:'600', color:'#111' },
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' },
    box: { background:'#fff', border:'1px solid #eee', borderRadius:'12px', padding:'16px', marginBottom:'16px' },
    boxTitle: { fontSize:'13px', fontWeight:'500', marginBottom:'12px', color:'#333' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:'12.5px' },
    th: { textAlign:'right', padding:'7px 12px', color:'#888', fontWeight:'500', borderBottom:'1px solid #eee' },
    td: { padding:'6px 12px', borderBottom:'1px solid #f5f5f5' },
  }

  return (
    <main style={s.wrap}>
      <div style={s.header}>
    <h1 style={{fontSize:'20px',fontWeight:'600',color:'#111'}}>Japan CPI Dashboard</h1>
    <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
      <a href="/tokyo-cpi" style={{fontSize:'12px',color:'#378ADD',textDecoration:'none'}}>Tokyo CPI (Leading) →</a>
      <a href="/consumption" style={{fontSize:'12px',color:'#9B59B6',textDecoration:'none'}}>Consumption →</a>
      <a href="/ppi" style={{fontSize:'12px',color:'#D85A30',textDecoration:'none'}}>PPI →</a>
      <span style={{fontSize:'12px',color:'#888'}}>Source: MIC e-Stat / Auto-updated monthly</span>
    </div>
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
        <div style={s.boxTitle}>Contribution to Headline CPI (Y/Y, pp) — Last 12 months</div>
        <Bar data={chart3} options={contribOpts} />
      </div>

      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>CPI Basket Weight Composition (2020 Base, /1000)</div>
          <Doughnut data={weightData} options={doughnutOpts} />
        </div>
        <div style={s.box}>
          <div style={s.boxTitle}>M/M Highlight — Last 3 months (NSA, not seasonally adjusted)</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{...s.th, textAlign:'left', width:'200px'}}>Series</th>
                {mmMonths.map(m => <th key={m} style={s.th}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {['Aggregate','Goods','Services'].map(group => (
                <React.Fragment key={group}>
                  <tr>
                    <td colSpan={4} style={{...s.td, fontSize:'11px', color:'#aaa', fontWeight:'600', textTransform:'uppercase', paddingTop:'12px', background:'#fafafa'}}>{group}</td>
                  </tr>
                  {mmRows.filter(r => r.group === group).map(row => (
                    <tr key={row.label}>
                      <td style={{...s.td, fontWeight: group==='Aggregate'?'600':'400'}}>{row.label}</td>
                      {(row.mm||[]).slice(-3).map(v => (
                        <td key={v.date} style={{...s.td, textAlign:'right', color: mmColor(v.value), fontWeight:'500'}}>
                          {v.value > 0 ? '+' : ''}{v.value.toFixed(2)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
