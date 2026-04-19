'use client'
import React, { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const s = {
  wrap: { maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 },
  nav: { display: 'flex', gap: 16, alignItems: 'center' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px 20px', marginBottom: 24 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 24 },
  kv: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 18px' },
  label: { fontSize: 11, color: '#888', marginBottom: 4 },
  val: { fontSize: 22, fontWeight: 700 },
}

const chartOpts = () => ({
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    y: { ticks: { callback: v => `${v}%` } },
    x: { ticks: { maxTicksLimit: 8 } }
  }
})

const color = (v) => v >= 0 ? '#27AE60' : '#E74C3C'

export default function GDPPage() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetch('/api/gdp')
      .then(r => r.json())
      .then(d => { if (d.error) setErr(d.error); else setData(d) })
      .catch(e => setErr(e.message))
  }, [])

  const latest = data?.gdp_qoq?.at(-1)
  const latestYoy = data?.gdp_yoy?.at(-1)

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111', margin: 0 }}>Japan GDP Dashboard</h1>
        <div style={s.nav}>
          <a href="/" style={{ fontSize: 12, color: '#E67E22', textDecoration: 'none' }}>CPI →</a>
          <a href="/consumption" style={{ fontSize: 12, color: '#9B59B6', textDecoration: 'none' }}>Consumption →</a>
          <a href="/ppi" style={{ fontSize: 12, color: '#D85A30', textDecoration: 'none' }}>PPI →</a>
          <span style={{ fontSize: 12, color: '#888' }}>Source: Cabinet Office / e-Stat</span>
        </div>
      </div>

      {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 16, color: '#dc2626', fontSize: 13 }}>{err}</div>}
      {!data && !err && <p style={{ color: '#888' }}>Loading...</p>}

      {data && <>
        <div style={s.cards}>
          <div style={s.kv}>
            <div style={s.label}>Latest QoQ ({latest?.date})</div>
            <div style={{ ...s.val, color: color(latest?.value) }}>{latest?.value?.toFixed(2)}%</div>
          </div>
          <div style={s.kv}>
            <div style={s.label}>Latest YoY ({latestYoy?.date})</div>
            <div style={{ ...s.val, color: color(latestYoy?.value) }}>{latestYoy?.value?.toFixed(2)}%</div>
          </div>
          <div style={s.kv}>
            <div style={s.label}>Annualized QoQ</div>
            <div style={{ ...s.val, color: color(latest?.value) }}>
              {latest ? ((Math.pow(1 + latest.value / 100, 4) - 1) * 100).toFixed(2) : '-'}%
            </div>
          </div>
        </div>

        <div style={s.card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>GDP Growth Rate (QoQ %)</h2>
          <Bar
            data={{
              labels: data.gdp_qoq.map(v => v.date),
              datasets: [{
                data: data.gdp_qoq.map(v => v.value),
                backgroundColor: data.gdp_qoq.map(v => color(v.value) + 'cc'),
                borderRadius: 3,
              }]
            }}
            options={chartOpts()}
          />
        </div>

        <div style={s.card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>GDP Growth Rate (YoY %)</h2>
          <Bar
            data={{
              labels: data.gdp_yoy.map(v => v.date),
              datasets: [{
                data: data.gdp_yoy.map(v => v.value),
                backgroundColor: data.gdp_yoy.map(v => color(v.value) + 'cc'),
                borderRadius: 3,
              }]
            }}
            options={chartOpts()}
          />
        </div>

        <div style={s.card}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Real GDP Level</h2>
          <Line
            data={{
              labels: data.gdp_levels.map(v => v.date),
              datasets: [{
                data: data.gdp_levels.map(v => v.value),
                borderColor: '#27AE60',
                backgroundColor: '#27AE6020',
                pointRadius: 3,
                tension: 0.3,
                fill: true,
              }]
            }}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { x: { ticks: { maxTicksLimit: 8 } } }
            }}
          />
        </div>
      </>}
    </main>
  )
}
