'use client'
import { useEffect, useState } from 'react'
import { Line, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function Labour() {
  const [labour, setLabour] = useState(null)
  const [wages,  setWages]  = useState(null)
  const [cpi,    setCpi]    = useState(null)

  useEffect(() => {
    fetch('/api/labour').then(r => r.json()).then(setLabour)
    fetch('/api/wages').then(r => r.json()).then(setWages)
    fetch('/api/cpi').then(r => r.json()).then(setCpi)
  }, [])

  if (!labour?.length) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading...</div>
  )

  const dates  = labour.map(d => d.date)
  const latest = labour.at(-1)
  const prev   = labour.at(-2)

  const urDiff = latest.unemploymentRate != null && prev?.unemploymentRate != null
    ? parseFloat((latest.unemploymentRate - prev.unemploymentRate).toFixed(1)) : null
  const prDiff = latest.participationRate != null && prev?.participationRate != null
    ? parseFloat((latest.participationRate - prev.participationRate).toFixed(1)) : null

  const s = {
    wrap:      { maxWidth: '980px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' },
    nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
    grid3:     { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' },
    grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:   { fontSize: '26px', fontWeight: '600', color: '#111' },
    box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
    badge:     { display: 'inline-block', fontSize: '10px', background: '#E8F0FE', color: '#1A56DB', borderRadius: '4px', padding: '2px 7px', marginLeft: '8px', fontWeight: '600' },
    note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
  }

  // Chart 1: Unemployment Rate with 3.0% reference line
  const chart1 = {
    labels: dates,
    datasets: [
      {
        label: 'Unemployment Rate SA (%)',
        data: labour.map(d => d.unemploymentRate),
        borderColor: '#E74C3C',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
      {
        label: '3.0% Reference',
        data: dates.map(() => 3.0),
        borderColor: '#bbb',
        borderWidth: 1,
        pointRadius: 0,
        borderDash: [5, 4],
        fill: false,
      },
    ],
  }

  const chart1Opts = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    spanGaps: false,
    scales: {
      y: {
        min: 1.5,
        max: 6.0,
        ticks: { callback: v => v.toFixed(1) + '%' },
      },
    },
  }

  // Chart 2: Dual axis — Employed YoY (left) vs Real Wage YoY (right)
  const wageMap = {}
  ;(wages?.real ?? []).forEach(d => { wageMap[d.date] = d.yoy })

  const chart2 = {
    labels: dates,
    datasets: [
      {
        label: 'Employed Persons YoY (%)',
        data: labour.map(d => d.employedYoY),
        borderColor: '#1A56DB',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
        yAxisID: 'y',
      },
      {
        label: 'Real Wages YoY (%)',
        data: dates.map(d => wageMap[d] ?? null),
        borderColor: '#E74C3C',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  }

  const chart2Opts = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    spanGaps: false,
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        ticks: { callback: v => v.toFixed(1) + '%' },
        title: { display: true, text: '就業者数 YoY (%)', color: '#1A56DB', font: { size: 11 } },
      },
      y1: {
        type: 'linear',
        position: 'right',
        ticks: { callback: v => v.toFixed(1) + '%' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: '実質賃金 YoY (%)', color: '#E74C3C', font: { size: 11 } },
      },
    },
  }

  // Chart 3: Participation Rate
  const chart3 = {
    labels: dates,
    datasets: [
      {
        label: 'Labor Force Participation Rate (%)',
        data: labour.map(d => d.participationRate),
        borderColor: '#27AE60',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
    ],
  }

  const chart3Opts = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    spanGaps: false,
    scales: {
      y: {
        ticks: { callback: v => v.toFixed(1) + '%' },
      },
    },
  }

  // Chart 4: Scatter — Unemployment Rate vs Core CPI (Phillips curve)
  const cpiMap = {}
  ;(cpi?.core ?? []).forEach(d => { cpiMap[d.date] = d.value })
  const scatterPoints = labour
    .filter(d => d.unemploymentRate != null && cpiMap[d.date] != null)
    .map((d, i, arr) => ({
      x: d.unemploymentRate,
      y: cpiMap[d.date],
      date: d.date,
      alpha: 0.3 + 0.7 * i / arr.length,
    }))

  const chart4 = {
    datasets: [
      {
        label: 'Unemployment Rate vs Core CPI Y/Y',
        data: scatterPoints.map(d => ({ x: d.x, y: d.y })),
        backgroundColor: scatterPoints.map(d => `rgba(26,86,219,${d.alpha.toFixed(2)})`),
        pointRadius: 5,
      },
    ],
  }

  const chart4Opts = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const p = scatterPoints[ctx.dataIndex]
            return p ? `${p.date}  失業率 ${p.x}%  / Core CPI ${p.y.toFixed(1)}%` : ''
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: '完全失業率 (%)' },
        ticks: { callback: v => v.toFixed(1) + '%' },
      },
      y: {
        title: { display: true, text: 'コア CPI 前年比 (%)' },
        ticks: { callback: v => v.toFixed(1) + '%' },
      },
    },
  }

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/wages" style={s.nav}>Wages</a>
          <a href="/cpi" style={s.nav}>CPI</a>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>
            Labour Force Survey
            <span style={s.badge}>Monthly · SA</span>
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>
          Source: 総務省 労働力調査 · Latest: {latest.date}
        </span>
      </div>

      {/* KPI cards */}
      <div style={s.grid3}>
        <div style={s.card}>
          <div style={s.cardLabel}>完全失業率 (SA)</div>
          <div style={s.cardVal}>
            {latest.unemploymentRate != null ? latest.unemploymentRate.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: urDiff === null ? '#888' : urDiff > 0 ? '#E24B4A' : urDiff < 0 ? '#1D9E75' : '#888' }}>
            {urDiff !== null ? (urDiff > 0 ? '+' : '') + urDiff.toFixed(1) + 'pp MoM' : ''}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>就業者数 前年比</div>
          <div style={{ ...s.cardVal, color: latest.employedYoY != null ? (latest.employedYoY >= 0 ? '#1D9E75' : '#E24B4A') : '#111' }}>
            {latest.employedYoY != null ? (latest.employedYoY >= 0 ? '+' : '') + latest.employedYoY.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: '#888' }}>
            {latest.employed != null ? latest.employed.toLocaleString() + ' 万人' : ''}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>労働参加率</div>
          <div style={s.cardVal}>
            {latest.participationRate != null ? latest.participationRate.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: prDiff === null ? '#888' : prDiff > 0 ? '#1D9E75' : prDiff < 0 ? '#E24B4A' : '#888' }}>
            {prDiff !== null ? (prDiff > 0 ? '+' : '') + prDiff.toFixed(1) + 'pp MoM' : ''}
          </div>
        </div>
      </div>

      {/* Chart 1: Unemployment Rate */}
      <div style={s.box}>
        <div style={s.boxTitle}>完全失業率 推移（24ヶ月、Seasonally Adjusted）</div>
        <Line data={chart1} options={chart1Opts} />
        <div style={s.note}>※ SA = 季節調整値。点線: 3.0%参照線。Source: 総務省 労働力調査</div>
      </div>

      {/* Chart 2: Dual axis */}
      <div style={s.box}>
        <div style={s.boxTitle}>就業者数 YoY(%) vs 実質賃金 YoY(%) — 労働需給と賃金転嫁</div>
        <Line data={chart2} options={chart2Opts} />
        <div style={s.note}>※ 就業者数前年比（左軸・青）と実質賃金前年比（右軸・赤）。労働需給の逼迫が賃金に転嫁されているかを確認。日銀の利上げ判断文脈。Source: 総務省 労働力調査 / 厚生労働省</div>
      </div>

      {/* Chart 3 + Chart 4 side by side */}
      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>労働参加率 推移（24ヶ月）</div>
          <Line data={chart3} options={chart3Opts} />
          <div style={s.note}>※ 労働力人口比率（15歳以上人口に対する労働力人口の割合）。Source: 総務省 労働力調査</div>
        </div>
        {scatterPoints.length > 0 && (
          <div style={s.box}>
            <div style={s.boxTitle}>フィリップス曲線（失業率 vs コアCPI、直近24ヶ月）</div>
            <Scatter data={chart4} options={chart4Opts} />
            <div style={s.note}>※ X軸: 完全失業率 / Y軸: コアCPI前年比。点の濃さが時間の流れ（薄=過去、濃=直近）。Source: 総務省 / 総務省</div>
          </div>
        )}
      </div>
    </main>
  )
}
