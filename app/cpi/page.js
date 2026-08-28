'use client'
import React, { useEffect, useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { DashboardFreshness, DashboardState } from '../components/DashboardStatus'
import { momentumSignal, movingAverage, yoyMomentum } from '../lib/japan-cpi-momentum.mjs'
import styles from './page.module.css'
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

export default function Home() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/cpi').then(r => r.json()).then(setData)
  }, [])

  if (!data || !data.headline?.length) return (
    <DashboardState />
  )

  const {
    headline, core, corecore, services,
    food_ex_fresh, energy, goods_ex_food_energy,
    housing, medical, transport, education, comms, leisure, eating_out, apparel, furniture,
    headline_mm, core_mm, corecore_mm, services_mm,
    food_mm, energy_mm, goods_mm, housing_mm, medical_mm,
    transport_mm, education_mm, comms_mm, leisure_mm, eating_out_mm, apparel_mm, furniture_mm,
    contrib
  } = data

  const labels = headline.map(v => v.date)
  const core3mma = movingAverage(core).map(point => point.value)
  const services3mma = movingAverage(services).map(point => point.value)

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
      'Housing 16%',
      'Food ex. Fresh 22%',
      'Transport & Comms 14%',
      'Services ex. Rent 11%',
      'Leisure & Education 9%',
      'Energy 7%',
      'Goods ex. Food & Energy 8%',
      'Medical 5%',
      'Apparel 4%',
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

  const momentumRows = [
    { label:'Headline', yoy:headline, mm:headline_mm, group:'Aggregate' },
    { label:'Core (ex. Fresh Food)', yoy:core, mm:core_mm, group:'Aggregate' },
    { label:'Core-Core (ex. Fresh Food & Energy)', yoy:corecore, mm:corecore_mm, group:'Aggregate' },
    { label:'Services (ex. Imputed Rent)', yoy:services, mm:services_mm, group:'Aggregate' },
    { label:'Food (ex. Fresh)', yoy:food_ex_fresh, mm:food_mm, group:'Goods' },
    { label:'Energy', yoy:energy, mm:energy_mm, group:'Goods' },
    { label:'Goods (ex. Food & Energy)', yoy:goods_ex_food_energy, mm:goods_mm, group:'Goods' },
    { label:'Furniture & Household', yoy:furniture, mm:furniture_mm, group:'Goods' },
    { label:'Apparel & Footwear', yoy:apparel, mm:apparel_mm, group:'Goods' },
    { label:'Housing', yoy:housing, mm:housing_mm, group:'Services' },
    { label:'Medical & Healthcare', yoy:medical, mm:medical_mm, group:'Services' },
    { label:'Transport', yoy:transport, mm:transport_mm, group:'Services' },
    { label:'Communications', yoy:comms, mm:comms_mm, group:'Services' },
    { label:'Education', yoy:education, mm:education_mm, group:'Services' },
    { label:'Leisure & Culture', yoy:leisure, mm:leisure_mm, group:'Services' },
    { label:'Eating Out', yoy:eating_out, mm:eating_out_mm, group:'Services' },
  ].map(row => ({ ...row, stats:yoyMomentum(row.yoy, row.mm) }))

  const cards = [
    { label:'Headline', stats:momentumRows[0].stats },
    { label:'Core ex. Fresh Food', stats:momentumRows[1].stats },
    { label:'Core-Core', stats:momentumRows[2].stats },
    { label:'Services ex. Imputed Rent', stats:momentumRows[3].stats },
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
    card: { background:'#f8f8f6', borderRadius:'10px', padding:'14px 16px' },
    cardLabel: { fontSize:'10px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' },
    cardVal: { fontSize:'22px', fontWeight:'600', color:'#111' },
    box: { background:'#fff', border:'1px solid #eee', borderRadius:'12px', padding:'16px', marginBottom:'16px' },
    boxTitle: { fontSize:'13px', fontWeight:'500', marginBottom:'12px', color:'#333' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:'12.5px' },
    th: { textAlign:'right', padding:'7px 12px', color:'#888', fontWeight:'500', borderBottom:'1px solid #eee' },
    td: { padding:'6px 12px', borderBottom:'1px solid #f5f5f5' },
    note: { fontSize:'11px', lineHeight:'1.55', color:'#777', marginTop:'10px' },
  }

  const signed = (value, digits = 1, suffix = '%') => Number.isFinite(value)
    ? `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`
    : '—'
  const signalColor = signal => signal === 'Accelerating'
    ? '#D85A30'
    : signal === 'Cooling' ? '#1D9E75' : '#777'

  return (
    <main className="dashboard-page" style={s.wrap}>
      <DashboardFreshness data={data} source="MIC · e-Stat" />
      <div className={styles.dashboardHeader}>
    <h1 style={{fontSize:'20px',fontWeight:'600',color:'#111'}}>Japan CPI Dashboard</h1>
    <div className={styles.dashboardLinks}>
      <a href="/" style={{fontSize:'12px',color:'#555',textDecoration:'none'}}>← Home</a>
      <a href="/tokyo-cpi" style={{fontSize:'12px',color:'#378ADD',textDecoration:'none'}}>Tokyo CPI →</a>
      <a href="/ppi" style={{fontSize:'12px',color:'#D85A30',textDecoration:'none'}}>PPI →</a>
      <span style={{fontSize:'12px',color:'#888'}}>Source: MIC e-Stat</span>
    </div>
  </div>

      <div className={styles.cardGrid}>
        {cards.map(k => (
          <div key={k.label} style={s.card}>
            <div style={s.cardLabel}>{k.label}</div>
            <div style={s.cardVal}>{Number.isFinite(k.stats.yoy) ? k.stats.yoy.toFixed(1)+'%' : '—'}</div>
            <div style={{fontSize:'11px', color:'#666', marginTop:'5px'}}>3MMA {Number.isFinite(k.stats.mma3) ? k.stats.mma3.toFixed(2)+'%' : '—'}</div>
            <div style={{fontSize:'11px', color:signalColor(momentumSignal(k.stats.mma3Change)), marginTop:'3px'}}>
              {momentumSignal(k.stats.mma3Change)} · {signed(k.stats.mma3Change, 2, 'pp')}
            </div>
          </div>
        ))}
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>Inflation Momentum Scorecard — latest release</div>
        <div className={styles.tableScroller}>
          <table style={{...s.table, minWidth:'720px'}}>
            <thead>
              <tr>
                <th style={{...s.th, textAlign:'left'}}>Series</th>
                <th style={s.th}>Y/Y</th>
                <th style={s.th}>3MMA Y/Y</th>
                <th style={s.th}>3MMA Δ</th>
                <th style={s.th}>Latest M/M</th>
                <th style={{...s.th, textAlign:'left'}}>Signal</th>
              </tr>
            </thead>
            <tbody>
              {['Aggregate','Goods','Services'].map(group => (
                <React.Fragment key={group}>
                  <tr><td colSpan={6} style={{...s.td, fontSize:'11px', color:'#999', fontWeight:'600', textTransform:'uppercase', background:'#fafafa'}}>{group}</td></tr>
                  {momentumRows.filter(row => row.group === group).map(row => {
                    const signal = momentumSignal(row.stats.mma3Change)
                    return (
                      <tr key={row.label}>
                        <td style={{...s.td, fontWeight:group === 'Aggregate' ? '600' : '400'}}>{row.label}</td>
                        <td style={{...s.td, textAlign:'right'}}>{signed(row.stats.yoy)}</td>
                        <td style={{...s.td, textAlign:'right'}}>{signed(row.stats.mma3, 2)}</td>
                        <td style={{...s.td, textAlign:'right', color:signalColor(signal)}}>{signed(row.stats.mma3Change, 2, 'pp')}</td>
                        <td style={{...s.td, textAlign:'right'}}>{signed(row.stats.monthlyNsa, 1)}</td>
                        <td style={{...s.td, color:signalColor(signal)}}>{signal}</td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div style={s.note}>3MMA is the average of the latest three official Y/Y rates. “3MMA Δ” compares the latest 3MMA with the prior month’s 3MMA. M/M figures are not seasonally adjusted and are shown as release detail—not as a three-month annualized pace.</div>
      </div>

      <div className={styles.chartGrid}>
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
        <div style={s.boxTitle}>Approximate Contribution to Headline CPI (Y/Y, pp) — Last 12 months</div>
        <Bar data={chart3} options={contribOpts} />
        <div style={s.note}>Approximation using fixed 2020-base basket weights; components overlap and may not sum exactly to the official headline contribution.</div>
      </div>

      <div className={styles.chartGrid}>
        <div style={s.box}>
          <div style={s.boxTitle}>CPI Basket Weight Composition (2020 Base, /1000)</div>
          <Doughnut data={weightData} options={doughnutOpts} />
        </div>
        <div style={s.box}>
          <div style={s.boxTitle}>M/M Highlight — Last 3 months (NSA, not seasonally adjusted)</div>
          <div className={styles.tableScroller}><table style={{...s.table, minWidth:'420px'}}>
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
          </table></div>
        </div>
      </div>
      <div style={s.note}>Methodology: Y/Y rates and NSA monthly changes come from MIC e-Stat. Japan’s “core” excludes fresh food; “core-core” here excludes fresh food and energy, so it is not identical to the U.S. core definition. A 3-month annualized rate is intentionally not calculated from detailed NSA series.</div>
    </main>
  )
}
