'use client'
import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function JobRatio() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/job-ratio').then(r => r.json()).then(setData)
  }, [])

  if (!data?.series?.length) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading...</div>
  )

  const { latest, series } = data
  const dates = series.map(d => d.date)

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

  const ratioColor  = '#7C3AED'
  const urColor     = '#E74C3C'
  const newJobColor = '#1A56DB'

  // Chart 1: 有効求人倍率 SA — 24 months with 1.0 reference line
  const chart1 = {
    labels: dates,
    datasets: [
      {
        label: 'Job-to-Applicant Ratio SA (excl. new grads)',
        data: series.map(d => d.ratio),
        borderColor: ratioColor,
        borderWidth: 2.5,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
      {
        label: '1.0x Reference',
        data: dates.map(() => 1.0),
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
        min: 0.8,
        ticks: { callback: v => v.toFixed(2) + 'x' },
        title: { display: true, text: 'Ratio (times)', font: { size: 11 } },
      },
    },
  }

  // Chart 2: YoY % — ratio and new jobs
  const chart2 = {
    labels: dates,
    datasets: [
      {
        label: 'Ratio YoY (%)',
        data: series.map(d => d.ratioYoY),
        borderColor: ratioColor,
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'New Job Openings YoY (%)',
        data: series.map(d => d.newJobsYoY),
        borderColor: newJobColor,
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
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
      y: { ticks: { callback: v => v.toFixed(1) + '%' } },
    },
  }

  // Chart 3: Dual axis — Job Ratio (left) vs Unemployment Rate (right)
  const urSeries = series.map(d => d.ur)
  const hasUR = urSeries.some(v => v != null)

  const chart3 = {
    labels: dates,
    datasets: [
      {
        label: 'Job-to-Applicant Ratio SA',
        data: series.map(d => d.ratio),
        borderColor: ratioColor,
        borderWidth: 2.5,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
        yAxisID: 'y',
      },
      ...(hasUR ? [{
        label: 'Unemployment Rate SA (%)',
        data: urSeries,
        borderColor: urColor,
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
        yAxisID: 'y1',
      }] : []),
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
        type: 'linear',
        position: 'left',
        min: 0.8,
        ticks: { callback: v => v.toFixed(2) + 'x', color: ratioColor },
        title: { display: true, text: 'Job-to-Applicant Ratio', color: ratioColor, font: { size: 11 } },
      },
      ...(hasUR ? {
        y1: {
          type: 'linear',
          position: 'right',
          ticks: { callback: v => v.toFixed(1) + '%', color: urColor },
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Unemployment Rate (%)', color: urColor, font: { size: 11 } },
        },
      } : {}),
    },
  }

  const diffColor = (v) => v === null ? '#888' : v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'
  const diffSign  = (v) => v > 0 ? '+' : ''

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/labour" style={s.nav}>Labour Force</a>
          <a href="/wages" style={s.nav}>Wages</a>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>
            Job-to-Applicant Ratio
            <span style={s.badge}>Monthly · SA</span>
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>
          Source: Cabinet Office (景気動向指数) · Latest: {latest.date}
        </span>
      </div>

      {/* KPI Cards */}
      <div style={s.grid3}>
        <div style={s.card}>
          <div style={s.cardLabel}>Job-to-Applicant Ratio SA</div>
          <div style={s.cardVal}>
            {latest.ratio != null ? latest.ratio.toFixed(2) + 'x' : '--'}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: diffColor(latest.ratioDiff) }}>
            {latest.ratioDiff != null ? diffSign(latest.ratioDiff) + latest.ratioDiff.toFixed(2) + 'x MoM' : ''}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>YoY Change</div>
          <div style={{ ...s.cardVal, color: diffColor(latest.ratioYoY) }}>
            {latest.ratioYoY != null ? diffSign(latest.ratioYoY) + latest.ratioYoY.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: '#888' }}>
            vs. same month prior year
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Unemployment Rate SA</div>
          <div style={s.cardVal}>
            {(() => {
              const urLatest = [...series].reverse().find(d => d.ur != null)
              return urLatest ? urLatest.ur.toFixed(1) + '%' : '--'
            })()}
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px', color: '#888' }}>
            Labour Force Survey (MIC)
          </div>
        </div>
      </div>

      {/* Chart 1: Ratio trend */}
      <div style={s.box}>
        <div style={s.boxTitle}>
          Job-to-Applicant Ratio (SA) — 24 Months
          <span style={{ ...s.badge, background: '#F3F0FF', color: '#7C3AED' }}>Coincident Indicator</span>
        </div>
        <Line data={chart1} options={chart1Opts} />
        <div style={s.note}>
          SA = seasonally adjusted. Series: 有効求人倍率(除学卒) — effective job openings ÷ effective job seekers, excl. new graduate positions. Dashed: 1.0x equilibrium. Source: Cabinet Office 景気動向指数 C9
        </div>
      </div>

      {/* Chart 2: YoY */}
      <div style={s.box}>
        <div style={s.boxTitle}>Supply &amp; Demand (YoY %) — Job Ratio &amp; New Openings</div>
        <Line data={chart2} options={chart2Opts} />
        <div style={s.note}>
          Purple: job-to-applicant ratio YoY. Blue: new job openings YoY (leading indicator, excl. new grad positions). Source: Cabinet Office 景気動向指数 L3/C9
        </div>
      </div>

      {/* Chart 3: Dual axis — ratio vs unemployment rate */}
      <div style={s.box}>
        <div style={s.boxTitle}>Labor Market Tightness: Job Ratio vs. Unemployment Rate</div>
        <Line data={chart3} options={chart3Opts} />
        <div style={s.note}>
          Left axis: job-to-applicant ratio SA (purple). Right axis: unemployment rate SA (red). Tighter labor market = higher ratio, lower unemployment. Unemployment rate from Labour Force Survey (Statistics Bureau).
        </div>
      </div>
    </main>
  )
}
