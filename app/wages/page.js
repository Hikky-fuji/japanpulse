'use client'
import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function Wages() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/wages').then(r => r.json()).then(setData)
  }, [])

  if (!data?.nominal?.length) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading...</div>
  )

  const { nominal, real, scheduled, parttime_ratio, nominal_same, scheduled_same, latest_date } = data

  const latestNom   = nominal.at(-1)
  const latestReal  = real.at(-1)
  const latestSched = scheduled.at(-1)
  const latestPt    = parttime_ratio.at(-1)
  const latestNomSame  = nominal_same?.at(-1)
  const latestSchedSame = scheduled_same?.at(-1)

  const labels = nominal.map(d => d.date)
  const realMap = {}
  real.forEach(d => { realMap[d.date] = d })
  const schedMap = {}
  scheduled.forEach(d => { schedMap[d.date] = d })
  const nomSameMap = {}
  ;(nominal_same ?? []).forEach(d => { nomSameMap[d.date] = d })
  const schedSameMap = {}
  ;(scheduled_same ?? []).forEach(d => { schedSameMap[d.date] = d })

  const chart1 = {
    labels,
    datasets: [
      {
        label: 'Nominal Wages Y/Y (%)',
        data: nominal.map(d => d.yoy),
        borderColor: '#2980B9',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Real Wages Y/Y (%)',
        data: labels.map(d => realMap[d]?.yoy ?? null),
        borderColor: '#E74C3C',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: {
          target: { value: 0 },
          below: 'rgba(231,76,60,0.18)',
          above: 'transparent',
        },
      },
      {
        label: 'Scheduled Wages Y/Y (%)',
        data: labels.map(d => schedMap[d]?.yoy ?? null),
        borderColor: '#27AE60',
        borderWidth: 1.5,
        pointRadius: 2,
        tension: 0.3,
        borderDash: [4, 3],
        fill: false,
      },
      {
        label: 'Nominal Wages (Same Establishment) Y/Y (%)',
        data: labels.map(d => nomSameMap[d]?.yoy ?? null),
        borderColor: '#8E44AD',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        borderDash: [2, 2],
        fill: false,
      },
      {
        label: 'Scheduled Wages (Same Establishment) Y/Y (%)',
        data: labels.map(d => schedSameMap[d]?.yoy ?? null),
        borderColor: '#16A085',
        borderWidth: 1.5,
        pointRadius: 2,
        tension: 0.3,
        borderDash: [2, 2],
        fill: false,
      },
    ],
  }

  const chart2 = {
    labels,
    datasets: [
      {
        label: 'Nominal Wages (Index)',
        data: nominal.map(d => d.value),
        borderColor: '#2980B9',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Real Wages (Index)',
        data: labels.map(d => realMap[d]?.value ?? null),
        borderColor: '#E74C3C',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        fill: false,
      },
    ],
  }

  const baseOpts = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    spanGaps: false,
  }

  const yoyOpts = {
    ...baseOpts,
    scales: {
      y: {
        ticks: { callback: v => v.toFixed(1) + '%' },
        grid: { color: ctx => ctx.tick.value === 0 ? '#bbb' : '#f0f0f0' },
      },
    },
  }

  const indexOpts = {
    ...baseOpts,
    scales: {
      y: { ticks: { callback: v => v.toFixed(1) } },
    },
  }

  const s = {
    wrap:      { maxWidth: '980px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' },
    nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
    grid4:     { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' },
    grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:   { fontSize: '26px', fontWeight: '600', color: '#111' },
    box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
    badge:     { display: 'inline-block', fontSize: '10px', background: '#E8F0FE', color: '#1A56DB', borderRadius: '4px', padding: '2px 7px', marginLeft: '8px', fontWeight: '600' },
    note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
  }

  const yoyColor = v => v >= 0 ? '#1D9E75' : '#E24B4A'

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/cpi" style={s.nav}>National CPI</a>
          <a href="/iip" style={s.nav}>IIP</a>
          <a href="/ppi" style={s.nav}>PPI</a>
          <a href="/consumption" style={s.nav}>Consumption</a>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>
            Wages
            <span style={s.badge}>Monthly Labor Survey</span>
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>
          Source: MHLW · Latest: {latest_date}
        </span>
      </div>

      <div style={s.grid4}>
        <div style={s.card}>
          <div style={s.cardLabel}>Nominal Wages Y/Y</div>
          <div style={s.cardVal}>
            {latestNom?.yoy != null ? latestNom.yoy.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', color: latestNom?.yoy != null ? yoyColor(latestNom.yoy) : '#888', marginTop: '3px' }}>
            All establishments
          </div>
          {latestNomSame?.yoy != null && (
            <div style={{ fontSize: '11px', color: '#8E44AD', marginTop: '2px' }}>
              Same establishment: {latestNomSame.yoy.toFixed(1)}%
            </div>
          )}
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Real Wages Y/Y</div>
          <div style={{ ...s.cardVal, color: latestReal?.yoy != null && latestReal.yoy < 0 ? '#E24B4A' : '#111' }}>
            {latestReal?.yoy != null ? latestReal.yoy.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', color: latestReal?.yoy != null ? yoyColor(latestReal.yoy) : '#888', marginTop: '3px' }}>
            CPI-deflated
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Scheduled Wages Y/Y</div>
          <div style={s.cardVal}>
            {latestSched?.yoy != null ? latestSched.yoy.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', color: latestSched?.yoy != null ? yoyColor(latestSched.yoy) : '#888', marginTop: '3px' }}>
            All establishments
          </div>
          {latestSchedSame?.yoy != null && (
            <div style={{ fontSize: '11px', color: '#16A085', marginTop: '2px' }}>
              Same establishment: {latestSchedSame.yoy.toFixed(1)}%
            </div>
          )}
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Part-time Ratio</div>
          <div style={s.cardVal}>
            {latestPt?.value != null ? latestPt.value.toFixed(1) + '%' : '--'}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
            Part-time worker share
          </div>
        </div>
      </div>

      <div style={s.box}>
        <div style={s.boxTitle}>Wages Y/Y (%) — Nominal / Real / Scheduled (Last 24 months)</div>
        <Line data={chart1} options={yoyOpts} />
        <div style={s.note}>※ Negative real wage region highlighted in red. Scheduled wages shown as dashed line. Purple/green dotted lines are same-establishment basis.</div>
      </div>

      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Wage Index Level — Nominal / Real (Last 24 months)</div>
          <Line data={chart2} options={indexOpts} />
          <div style={s.note}>※ Seasonally adjusted index (Table 8)</div>
        </div>
        <div style={{ ...s.box, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={s.boxTitle}>Part-time Worker Ratio (Last 24 months)</div>
            <Line
              data={{
                labels: parttime_ratio.map(d => d.date),
                datasets: [{
                  label: 'Part-time ratio (%)',
                  data: parttime_ratio.map(d => d.value),
                  borderColor: '#F39C12',
                  borderWidth: 2,
                  pointRadius: 2,
                  tension: 0.3,
                  fill: false,
                }],
              }}
              options={{
                ...baseOpts,
                scales: { y: { ticks: { callback: v => v.toFixed(1) + '%' } } },
              }}
            />
          </div>
          <div style={s.note}>※ Part-time ratio (all establishments)</div>
        </div>
      </div>
    </main>
  )
}
