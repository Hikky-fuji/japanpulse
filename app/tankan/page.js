'use client'
import { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

export default function Tankan() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/tankan')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
      })
      .catch(e => setError(e.message))
  }, [])

  if (error) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#c00' }}>
      <b>API Error:</b> {error}
    </div>
  )
  if (!data?.large_mfg?.length) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading...</div>
  )

  const {
    large_mfg, large_mfg_fc,
    large_nonmfg, large_nonmfg_fc,
    med_mfg, small_mfg, small_nonmfg,
    large_mfg_surprise, large_nonmfg_surprise,
  } = data

  const latestMfg    = large_mfg.at(-1)
  const latestNonMfg = large_nonmfg.at(-1)
  const latestSmall  = small_mfg.at(-1)
  const latestFc     = large_mfg_fc.at(-1)   // next-quarter outlook
  const prevMfg      = large_mfg.at(-2)

  const diColor = v => v == null ? '#888' : v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'
  const fmt = v => v != null ? (v > 0 ? `+${v}` : String(v)) : '--'

  // --- Chart 1: Large Mfg — Actual vs Forecast trend ---
  const mfgLabels = large_mfg.slice(-20).map(v => v.date)
  const chart1 = {
    labels: mfgLabels,
    datasets: [
      {
        label: 'Large Mfg — Actual DI',
        data: large_mfg.slice(-20).map(v => v.value),
        borderColor: '#378ADD',
        borderWidth: 2.5,
        pointRadius: 4,
        tension: 0.2,
        fill: {
          target: { value: 0 },
          above: 'rgba(55,138,221,0.08)',
          below: 'rgba(226,75,74,0.08)',
        },
      },
      {
        label: 'Large Mfg — Next-Q Forecast',
        data: mfgLabels.map(d => large_mfg_fc.find(v => v.date === d)?.value ?? null),
        borderColor: '#378ADD',
        borderWidth: 1.5,
        pointRadius: 3,
        borderDash: [5, 4],
        tension: 0.2,
        spanGaps: false,
      },
    ],
  }

  // --- Chart 2: Mfg vs Non-Mfg (large) ---
  const allLabels = large_mfg.slice(-20).map(v => v.date)
  const chart2 = {
    labels: allLabels,
    datasets: [
      {
        label: 'Large Mfg',
        data: large_mfg.slice(-20).map(v => v.value),
        borderColor: '#378ADD',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
      {
        label: 'Large Non-Mfg',
        data: allLabels.map(d => large_nonmfg.find(v => v.date === d)?.value ?? null),
        borderColor: '#E67E22',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
      {
        label: 'Non-Mfg Forecast',
        data: allLabels.map(d => large_nonmfg_fc.find(v => v.date === d)?.value ?? null),
        borderColor: '#E67E22',
        borderWidth: 1.5,
        pointRadius: 2,
        borderDash: [5, 4],
        tension: 0.2,
        spanGaps: false,
      },
    ],
  }

  // --- Chart 3: Enterprise size (manufacturing) ---
  const sizeLabels = large_mfg.slice(-16).map(v => v.date)
  const chart3 = {
    labels: sizeLabels,
    datasets: [
      {
        label: 'Large',
        data: large_mfg.slice(-16).map(v => v.value),
        borderColor: '#378ADD',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
      {
        label: 'Medium',
        data: sizeLabels.map(d => med_mfg.find(v => v.date === d)?.value ?? null),
        borderColor: '#9B59B6',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
      {
        label: 'Small',
        data: sizeLabels.map(d => small_mfg.find(v => v.date === d)?.value ?? null),
        borderColor: '#E24B4A',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
    ],
  }

  // --- Chart 4: DI Surprise (actual - prior forecast) ---
  const surpriseData = large_mfg_surprise.slice(-12)
  const chart4 = {
    labels: surpriseData.map(v => v.date),
    datasets: [
      {
        label: 'Large Mfg DI Surprise (Actual − Prior Forecast)',
        data: surpriseData.map(v => v.value),
        backgroundColor: surpriseData.map(v => v.value >= 0 ? 'rgba(29,158,117,0.75)' : 'rgba(226,75,74,0.75)'),
        borderColor: surpriseData.map(v => v.value >= 0 ? '#1D9E75' : '#E24B4A'),
        borderWidth: 1,
      },
    ],
  }

  // --- Chart 5: Non-Mfg size (large vs small) ---
  const nonmfgLabels = large_nonmfg.slice(-16).map(v => v.date)
  const chart5 = {
    labels: nonmfgLabels,
    datasets: [
      {
        label: 'Large Non-Mfg',
        data: large_nonmfg.slice(-16).map(v => v.value),
        borderColor: '#E67E22',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
      },
      {
        label: 'Small Non-Mfg',
        data: nonmfgLabels.map(d => small_nonmfg.find(v => v.date === d)?.value ?? null),
        borderColor: '#F5A623',
        borderWidth: 2,
        pointRadius: 3,
        borderDash: [4, 3],
        tension: 0.2,
        spanGaps: false,
      },
    ],
  }

  const lineOpts = (zero = true) => ({
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      y: {
        ticks: { callback: v => v },
        grid: zero ? { color: ctx => ctx.tick.value === 0 ? '#aaa' : '#f0f0f0' } : {},
      },
    },
  })

  const barOpts = {
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      y: {
        ticks: { callback: v => v },
        grid: { color: ctx => ctx.tick.value === 0 ? '#aaa' : '#f0f0f0' },
      },
    },
  }

  const s = {
    wrap:      { maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' },
    nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
    grid4:     { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' },
    grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:   { fontSize: '28px', fontWeight: '600', color: '#111' },
    box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
    badge:     { display: 'inline-block', fontSize: '10px', background: '#FEF3C7', color: '#92400E', borderRadius: '4px', padding: '2px 7px', marginLeft: '8px', fontWeight: '600' },
    note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
    zero:      { borderTop: '1px solid #ccc', marginTop: '2px', paddingTop: '2px', fontSize: '10px', color: '#bbb' },
  }

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/cpi" style={s.nav}>CPI</a>
          <a href="/iip" style={s.nav}>IIP</a>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>
            Tankan — Business Conditions Survey
            <span style={s.badge}>Quarterly</span>
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>
          Source: Bank of Japan · Latest: {latestMfg?.date}
        </span>
      </div>

      {/* KPI Cards */}
      <div style={s.grid4}>
        <div style={s.card}>
          <div style={s.cardLabel}>Large Mfg DI (Current)</div>
          <div style={{ ...s.cardVal, color: diColor(latestMfg?.value) }}>{fmt(latestMfg?.value)}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
            prev: {fmt(prevMfg?.value)} ({prevMfg?.date})
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Large Non-Mfg DI (Current)</div>
          <div style={{ ...s.cardVal, color: diColor(latestNonMfg?.value) }}>{fmt(latestNonMfg?.value)}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
            vs Large Mfg: {latestMfg && latestNonMfg ? fmt(parseFloat((latestNonMfg.value - latestMfg.value).toFixed(0))) : '--'} spread
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Small Mfg DI (Current)</div>
          <div style={{ ...s.cardVal, color: diColor(latestSmall?.value) }}>{fmt(latestSmall?.value)}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
            Large-Small gap: {latestMfg && latestSmall ? fmt(parseFloat((latestMfg.value - latestSmall.value).toFixed(0))) : '--'}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Large Mfg — Next-Q Outlook</div>
          <div style={{ ...s.cardVal, color: diColor(latestFc?.value) }}>{fmt(latestFc?.value)}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
            Change from actual: {latestMfg && latestFc ? fmt(parseFloat((latestFc.value - latestMfg.value).toFixed(0))) : '--'}
          </div>
        </div>
      </div>

      {/* Chart 1: Large Mfg actual + forecast */}
      <div style={s.box}>
        <div style={s.boxTitle}>Large Manufacturing DI — Actual vs Next-Quarter Forecast (Last 5 years)</div>
        <Line data={chart1} options={lineOpts()} />
        <div style={s.note}>※ DI = % "Good" − % "Poor". Positive = net optimism. Dashed line = forecast made in same quarter for next quarter.</div>
      </div>

      {/* Charts 2 & 3 */}
      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Mfg vs Non-Mfg DI — Large Enterprises</div>
          <Line data={chart2} options={lineOpts()} />
          <div style={s.note}>※ Non-Mfg DI persistently higher since 2013 (services expansion). Dashed = forecast.</div>
        </div>
        <div style={s.box}>
          <div style={s.boxTitle}>Manufacturing DI by Enterprise Size</div>
          <Line data={chart3} options={lineOpts()} />
          <div style={s.note}>※ Large-Small spread widens during economic stress; convergence signals recovery.</div>
        </div>
      </div>

      {/* Chart 4: Surprise */}
      <div style={s.box}>
        <div style={s.boxTitle}>Large Mfg DI Surprise — Actual minus Prior-Quarter Forecast (Last 12 quarters)</div>
        <Bar data={chart4} options={barOpts} />
        <div style={s.note}>※ Positive = conditions beat expectations. Persistent negative = systematic over-optimism in forecasts.</div>
      </div>

      {/* Chart 5: Non-Mfg size */}
      <div style={s.box}>
        <div style={s.boxTitle}>Non-Manufacturing DI — Large vs Small Enterprises</div>
        <Line data={chart5} options={lineOpts()} />
        <div style={s.note}>※ Small non-mfg includes retail, food service. Dashed = small enterprise series.</div>
      </div>
    </main>
  )
}
