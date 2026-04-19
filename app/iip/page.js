'use client'
import { useEffect, useState, useRef } from 'react'
import { Line, Bar, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend,
  ScatterController
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ScatterController)

const SECTORS = [
  { key: '鉱工業',               label: 'Mining & Mfg (Total)' },
  { key: '輸送機械工業',          label: 'Transport Equipment' },
  { key: '自動車工業',            label: 'Motor Vehicles' },
  { key: '電子部品・デバイス工業', label: 'Electronic Components' },
  { key: '電気・情報通信機械工業', label: 'Electrical & ICT' },
  { key: '生産用機械工業',        label: 'Production Machinery' },
  { key: '化学工業（除．医薬品）', label: 'Chemicals (ex Pharma)' },
  { key: '資本財',               label: 'Capital Goods' },
  { key: '耐久消費財',            label: 'Durable Consumer' },
  { key: '非耐久消費財',          label: 'Non-durable Consumer' },
  { key: '生産財',               label: 'Intermediate Goods' },
]

const FINANCIAL_SECTORS = ['資本財', '耐久消費財', '非耐久消費財', '生産財']

function HeatmapCell({ value }) {
  if (value == null) return <td style={{padding:'6px 8px', textAlign:'center', background:'#f5f5f5', fontSize:'11px', color:'#ccc'}}>—</td>
  const abs = Math.min(Math.abs(value), 15)
  const intensity = abs / 15
  const bg = value > 0
    ? `rgba(29,158,117,${0.15 + intensity * 0.7})`
    : `rgba(226,75,74,${0.15 + intensity * 0.7})`
  const color = intensity > 0.5 ? '#fff' : '#333'
  return (
    <td style={{padding:'6px 8px', textAlign:'center', background:bg, color, fontSize:'11px', fontWeight:'500'}}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}
    </td>
  )
}

export default function IIP() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/iip').then(r => r.json()).then(setData)
  }, [])

  if (!data?.['鉱工業']?.length) return (
    <div style={{padding:'40px', fontFamily:'sans-serif', color:'#666'}}>Loading...</div>
  )

  const total = data['鉱工業']
  const latest = total.at(-1)
  const prev = total.at(-2)
  const labels = total.map(v => v.date)

  // チャート①：総合トレンド
  const chart1 = {
    labels,
    datasets: [
      { label: 'Production SA', data: total.map(v => v.prod_sa), borderColor: '#378ADD', borderWidth: 2, pointRadius: 0, tension: 0.3 },
      { label: 'Shipments SA',  data: total.map(v => v.ship_sa), borderColor: '#1D9E75', borderWidth: 2, pointRadius: 0, tension: 0.3 },
      { label: 'Inventory Ratio SA', data: total.map(v => v.invr_sa), borderColor: '#E24B4A', borderWidth: 1.5, pointRadius: 0, tension: 0.3, borderDash: [4,3] },
    ]
  }

  // チャート②：財別Y/Y
  const chart2 = {
    labels,
    datasets: FINANCIAL_SECTORS.map((key, i) => ({
      label: SECTORS.find(s => s.key === key)?.label ?? key,
      data: labels.map(date => {
        const d = (data[key] || []).find(v => v.date === date)
        return d?.prod_yoy ?? null
      }),
      borderColor: ['#378ADD','#D85A30','#1D9E75','#9B59B6'][i],
      borderWidth: 2, pointRadius: 0, tension: 0.3, spanGaps: true,
    }))
  }

  // チャート③：業種別最新M/M横棒
  const latestDate = latest.date
  const sectorMoM = SECTORS.slice(1).map(s => {
    const d = (data[s.key] || []).find(v => v.date === latestDate)
    return { label: s.label, value: d?.prod_mom ?? null }
  }).filter(s => s.value != null)

  const chart3 = {
    labels: sectorMoM.map(s => s.label),
    datasets: [{
      label: `Production M/M % (${latestDate})`,
      data: sectorMoM.map(s => s.value),
      backgroundColor: sectorMoM.map(s => s.value >= 0 ? 'rgba(29,158,117,0.7)' : 'rgba(226,75,74,0.7)'),
      borderColor: sectorMoM.map(s => s.value >= 0 ? '#1D9E75' : '#E24B4A'),
      borderWidth: 1,
    }]
  }

  // 在庫循環図（散布図）：X軸=生産Y/Y、Y軸=在庫Y/Y
  const cyclePoints = total
    .filter(v => v.prod_yoy != null && v.inv_yoy != null)
    .slice(-24)
  const cycleData = {
    datasets: [{
      label: 'Inventory Cycle',
      data: cyclePoints.map((v, i) => ({
        x: v.prod_yoy,
        y: v.inv_yoy,
        date: v.date,
      })),
      backgroundColor: cyclePoints.map((v, i) => {
        const alpha = 0.3 + (i / cyclePoints.length) * 0.7
        return `rgba(55,138,221,${alpha})`
      }),
      pointRadius: cyclePoints.map((_, i) => i === cyclePoints.length - 1 ? 8 : 4),
      pointStyle: cyclePoints.map((_, i) => i === cyclePoints.length - 1 ? 'star' : 'circle'),
    }]
  }

  // 予測指数チャート
  const forecast = data['forecast'] || []
  const fcLabels = forecast.map(v => v.date)
  const forecastChart = {
    labels: fcLabels,
    datasets: [
      {
        label: 'Actual (prev month)',
        data: forecast.map(v => v.actual),
        borderColor: '#378ADD',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
      },
      {
        label: 'Current month forecast',
        data: forecast.map(v => v.current),
        borderColor: '#F5A623',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        borderDash: [4, 3],
      },
      {
        label: 'Next month forecast',
        data: forecast.map(v => v.next),
        borderColor: '#9B59B6',
        borderWidth: 1.5,
        pointRadius: 3,
        tension: 0.3,
        borderDash: [6, 4],
      },
    ]
  }

  // ヒートマップ
  const heatLabels = labels.slice(-12)
  const heatData = SECTORS.map(s => ({
    label: SECTORS.find(x => x.key === s.key)?.label ?? s.key,
    values: heatLabels.map(date => {
      const d = (data[s.key] || []).find(v => v.date === date)
      return d?.prod_yoy ?? null
    }),
    isFlash: heatLabels.map(date => {
      const d = (data[s.key] || []).find(v => v.date === date)
      return d?.is_flash ?? false
    })
  }))

  const lineOpts = {
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: { y: { ticks: { callback: v => v.toFixed(1) } } }
  }
  const lineOptsPercent = {
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: { y: { ticks: { callback: v => v + '%' } } }
  }
  const barHorizOpts = {
    responsive: true,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: { x: { ticks: { callback: v => v + '%' } } }
  }
  const scatterOpts = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const d = cyclePoints[ctx.dataIndex]
            return `${d.date}: Prod=${d.prod_yoy}% Inv=${d.inv_yoy}%`
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Production Y/Y %' },
        ticks: { callback: v => v + '%' },
        grid: { color: (ctx) => ctx.tick.value === 0 ? '#999' : '#eee' }
      },
      y: {
        title: { display: true, text: 'Inventory Y/Y %' },
        ticks: { callback: v => v + '%' },
        grid: { color: (ctx) => ctx.tick.value === 0 ? '#999' : '#eee' }
      }
    }
  }

  const s = {
    wrap:      { maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' },
    nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
    grid4:     { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' },
    card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:   { fontSize: '24px', fontWeight: '600', color: '#111' },
    grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
    badge:     { display: 'inline-block', fontSize: '10px', background: '#FEF3C7', color: '#92400E', borderRadius: '4px', padding: '2px 6px', marginLeft: '6px', fontWeight: '600' },
    note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
    table:     { width: '100%', borderCollapse: 'collapse', fontSize: '11px' },
    th:        { padding: '6px 8px', background: '#f8f8f6', fontWeight: '600', fontSize: '10px', color: '#888', textAlign: 'center', borderBottom: '1px solid #eee' },
    thLeft:    { padding: '6px 8px', background: '#f8f8f6', fontWeight: '600', fontSize: '10px', color: '#888', textAlign: 'left', borderBottom: '1px solid #eee' },
    tdLabel:   { padding: '6px 8px', fontSize: '11px', fontWeight: '500', color: '#333', whiteSpace: 'nowrap', borderBottom: '1px solid #f5f5f5' },
    quadrant:  { position: 'relative' },
    quadLabel: { position: 'absolute', fontSize: '10px', color: '#bbb', fontWeight: '600' },
  }

  const kpiColor = (v) => v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'
  const fmt = (v, suffix='') => v != null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}${suffix}` : '--'

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← National CPI</a>
          <a href="/consumption" style={s.nav}>Consumption</a>
          <span style={{fontSize:'20px', fontWeight:'600', color:'#111'}}>
            Industrial Production Index
            {latest?.is_flash && <span style={s.badge}>Flash</span>}
          </span>
        </div>
        <span style={{fontSize:'12px', color:'#888'}}>Source: METI / e-Stat · Latest: {latestDate}</span>
      </div>

      <div style={s.grid4}>
        <div style={s.card}>
          <div style={s.cardLabel}>Production SA (M/M)</div>
          <div style={s.cardVal}>{fmt(latest?.prod_mom, '%')}</div>
          <div style={{fontSize:'11px', color: kpiColor(latest?.prod_mom), marginTop:'3px'}}>prev: {fmt(prev?.prod_mom, '%')}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Production (Y/Y)</div>
          <div style={s.cardVal}>{fmt(latest?.prod_yoy, '%')}</div>
          <div style={{fontSize:'11px', color: kpiColor(latest?.prod_yoy), marginTop:'3px'}}>prev: {fmt(prev?.prod_yoy, '%')}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Shipments SA (M/M)</div>
          <div style={s.cardVal}>{fmt(latest?.ship_mom, '%')}</div>
          <div style={{fontSize:'11px', color: kpiColor(latest?.ship_mom), marginTop:'3px'}}>prev: {fmt(prev?.ship_mom, '%')}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Inventory Ratio SA (M/M)</div>
          <div style={s.cardVal}>{fmt(latest?.invr_mom, '%')}</div>
          <div style={{fontSize:'11px', color: kpiColor(latest?.invr_mom ? -latest.invr_mom : null), marginTop:'3px'}}>
            {latest?.invr_mom > 0 ? '↑ inventory building' : '↓ inventory drawing'}
          </div>
        </div>
      </div>

      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Total IIP — Production / Shipments / Inventory Ratio (SA Index)</div>
          <Line data={chart1} options={lineOpts} />
          <div style={s.note}>※ 2020=100 base, seasonally adjusted</div>
        </div>
        <div style={s.box}>
          <div style={s.boxTitle}>Sector Production M/M % — Latest Month ({latestDate})</div>
          <Bar data={chart3} options={barHorizOpts} />
          {latest?.is_flash && <div style={s.note}>※ Flash estimate</div>}
        </div>
      </div>

      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Inventory Cycle — Production vs Inventory Y/Y % (Last 24M)</div>
          <div style={{position:'relative'}}>
            <Scatter data={cycleData} options={scatterOpts} />
            <div style={{position:'absolute', top:'8px', right:'12px', fontSize:'10px', color:'#aaa', lineHeight:'1.6'}}>
              <div>↑Inv / ↑Prod → <b>Involuntary build</b></div>
              <div>↑Inv / ↓Prod → <b>Recession</b></div>
              <div>↓Inv / ↓Prod → <b>Destocking</b></div>
              <div>↓Inv / ↑Prod → <b>Recovery</b></div>
            </div>
          </div>
          <div style={s.note}>※ ★ = latest month. Darker = more recent. X-axis: Production Y/Y, Y-axis: Inventory Y/Y</div>
        </div>
        <div style={s.box}>
          <div style={s.boxTitle}>Production Forecast Index — Manufacturing (SA)</div>
          <Line data={forecastChart} options={lineOpts} />
          <div style={s.note}>※ Survey-based. Current/Next month = plan vs actual divergence indicator</div>
        </div>
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>Final Demand — Capital / Durable / Non-durable / Intermediate Y/Y (%)</div>
        <Line data={chart2} options={lineOptsPercent} />
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>Sector Production Y/Y % — Heatmap (Last 12 months)</div>
        <div style={{overflowX:'auto'}}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thLeft}>Sector</th>
                {heatLabels.map((d, i) => (
                  <th key={d} style={{...s.th, minWidth:'52px'}}>
                    {d.slice(5)}
                    {heatData[0]?.isFlash[i] && <span style={{color:'#D97706'}}> ★</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatData.map(row => (
                <tr key={row.label}>
                  <td style={s.tdLabel}>{row.label}</td>
                  {row.values.map((v, i) => <HeatmapCell key={i} value={v} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={s.note}>★ Flash estimate &nbsp; Green = positive Y/Y, Red = negative. Scale: ±15%</div>
      </div>
    </main>
  )
}
