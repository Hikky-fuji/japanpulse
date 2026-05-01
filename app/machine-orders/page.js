'use client'
import { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const s = {
  wrap:      { maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' },
  nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
  grid3:     { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' },
  card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
  cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardVal:   { fontSize: '24px', fontWeight: '600', color: '#111' },
  grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
  box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
  note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
}

const kpiColor = (v) => v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'
const fmt = (v, suffix = '') => v != null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}${suffix}` : '--'
const fmtLevel = (v) => v != null ? `¥${v.toFixed(2)}T` : '--'

const lineOpts = (yLabel = '%') => ({
  responsive: true,
  plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
  scales: { y: { ticks: { callback: v => v + yLabel } } },
})

const barGroupOpts = {
  responsive: true,
  plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
  scales: { y: { ticks: { callback: v => v + '%' } } },
}

export default function MachineOrders() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/machine-orders').then(r => r.json()).then(setData)
  }, [])

  if (!data?.series?.length) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading...</div>
  )

  const { latest, series, gdpCapex } = data
  const labels = series.map(d => d.date)
  const labels12 = labels.slice(-12)

  // Chart 1: Core Y/Y (NSA) last 24m
  const chart1 = {
    labels,
    datasets: [{
      label: 'Core Orders Y/Y (NSA)',
      data: series.map(d => d.coreYoY),
      borderColor: '#378ADD',
      backgroundColor: series.map(d => (d.coreYoY ?? 0) >= 0 ? 'rgba(55,138,221,0.15)' : 'rgba(226,75,74,0.15)'),
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.3,
      fill: true,
      spanGaps: true,
    }],
  }

  // Chart 2: Core MoM (SA) last 24m
  const chart2 = {
    labels,
    datasets: [{
      label: 'Core Orders MoM (SA)',
      data: series.map(d => d.coreMoM),
      borderColor: '#1D9E75',
      backgroundColor: series.map(d => (d.coreMoM ?? 0) >= 0 ? 'rgba(29,158,117,0.15)' : 'rgba(226,75,74,0.15)'),
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.3,
      fill: true,
      spanGaps: true,
    }],
  }

  // Chart 3: Mfg vs Non-Mfg Y/Y last 12m (grouped bar)
  const chart3 = {
    labels: labels12,
    datasets: [
      {
        label: 'Manufacturing Y/Y (NSA)',
        data: series.slice(-12).map(d => d.mfgYoY),
        backgroundColor: 'rgba(55,138,221,0.7)',
        borderColor: '#378ADD',
        borderWidth: 1,
      },
      {
        label: 'Non-Manufacturing Y/Y (NSA)',
        data: series.slice(-12).map(d => d.nonMfgYoY),
        backgroundColor: 'rgba(29,158,117,0.7)',
        borderColor: '#1D9E75',
        borderWidth: 1,
      },
    ],
  }

  // Chart 4: Dual-axis — Core Y/Y (left) vs GDP Capex Y/Y (right)
  // Align quarterly GDP to monthly labels by matching "YYYY-QX" to months in that quarter
  const capexMap = {}
  if (gdpCapex?.length) {
    for (const { date, value } of gdpCapex) {
      const [year, q] = date.split('-')
      const startMonth = { Q1: '01', Q2: '04', Q3: '07', Q4: '10' }[q]
      if (!startMonth) continue
      const endMonth  = { Q1: '03', Q2: '06', Q3: '09', Q4: '12' }[q]
      for (const m of [startMonth, String(parseInt(startMonth) + 1).padStart(2, '0'), endMonth]) {
        capexMap[`${year}/${m}`] = value
      }
    }
  }

  const dualLabels = labels
  const dualChart = {
    labels: dualLabels,
    datasets: [
      {
        label: 'Core Orders Y/Y % (left)',
        data: series.map(d => d.coreYoY),
        borderColor: '#378ADD',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'yLeft',
      },
      {
        label: 'GDP Capex Y/Y % (right)',
        data: dualLabels.map(date => capexMap[date] ?? null),
        borderColor: '#E24B4A',
        borderDash: [5, 4],
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'yRight',
      },
    ],
  }

  const dualOpts = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      yLeft: {
        type: 'linear',
        position: 'left',
        ticks: { callback: v => v + '%' },
        title: { display: true, text: 'Core Orders Y/Y %' },
      },
      yRight: {
        type: 'linear',
        position: 'right',
        ticks: { callback: v => v + '%' },
        title: { display: true, text: 'GDP Capex Y/Y %' },
        grid: { drawOnChartArea: false },
      },
    },
  }

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/iip" style={s.nav}>IIP</a>
          <a href="/gdp" style={s.nav}>GDP</a>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>
            Machine Orders (機械受注)
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>
          Source: Cabinet Office / e-Stat · Latest: {latest?.date}
        </span>
      </div>

      <div style={s.grid3}>
        <div style={s.card}>
          <div style={s.cardLabel}>Core Orders Y/Y (NSA)</div>
          <div style={{ ...s.cardVal, color: kpiColor(latest?.yoy) }}>
            {fmt(latest?.yoy, '%')}
          </div>
          <div style={{ fontSize: '11px', color: kpiColor(latest?.yoyPrev), marginTop: '3px' }}>
            prev: {fmt(latest?.yoyPrev, '%')}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Core Orders MoM (SA)</div>
          <div style={{ ...s.cardVal, color: kpiColor(latest?.mom) }}>
            {fmt(latest?.mom, '%')}
          </div>
          <div style={{ fontSize: '11px', color: kpiColor(latest?.momPrev), marginTop: '3px' }}>
            prev: {fmt(latest?.momPrev, '%')}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Core Orders Level (NSA)</div>
          <div style={s.cardVal}>{fmtLevel(latest?.level)}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
            trillion yen · {latest?.date}
          </div>
        </div>
      </div>

      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Core Machine Orders Y/Y — Last 24 Months</div>
          <Line data={chart1} options={lineOpts('%')} />
          <div style={s.note}>※ 船舶・電力除く民間需要 (NSA)</div>
        </div>
        <div style={s.box}>
          <div style={s.boxTitle}>Core Machine Orders MoM — Last 24 Months</div>
          <Line data={chart2} options={lineOpts('%')} />
          <div style={s.note}>※ 船舶・電力除く民間需要 (SA)</div>
        </div>
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>Manufacturing vs Non-Manufacturing Y/Y — Last 12 Months</div>
        <Bar data={chart3} options={barGroupOpts} />
        <div style={s.note}>※ 製造業 vs 非製造業(船舶除く) (NSA)</div>
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>Leading Indicator: Orders vs Capex — Core Orders Y/Y vs GDP Capex Y/Y</div>
        <Line data={dualChart} options={dualOpts} />
        <div style={s.note}>
          ※ Machine orders typically lead GDP capex by 6–9 months.
          GDP capex (総固定資本形成 Y/Y) is quarterly; plotted at each month of the quarter.
        </div>
      </div>
    </main>
  )
}
