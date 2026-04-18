'use client'
import { useEffect, useState, useRef } from 'react'

export default function Home() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    fetch('/api/cpi')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    if (!data || !data.headline || data.headline.length === 0) return

    const initChart = () => {
      const ctx = document.getElementById('cpichart')
      if (!ctx) return

      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }

      chartInstance.current = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: data.headline.map(v => v.date),
          datasets: [
            {
              label: 'Headline',
              data: data.headline.map(v => v.value),
              borderColor: '#378ADD',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'top' } },
          scales: { y: { ticks: { callback: v => v.toFixed(1) } } }
        }
      })
    }

    if (window.Chart) {
      initChart()
    } else {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
      script.onload = initChart
      document.head.appendChild(script)
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }
    }
  }, [data])

  if (error) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: 'red' }}>
      Error: {error}
    </div>
  )

  if (!data) return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>
      Loading...
    </div>
  )

  const latest = data.headline.at(-1)
  const prev = data.headline.at(-2)
  const diff = latest && prev ? (latest.value - prev.value).toFixed(1) : '0.0'
  const diffStr = diff > 0 ? `+${diff}pp` : `${diff}pp`

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>Japan CPI Dashboard</h1>
        <span style={{ fontSize: '12px', color: '#888' }}>Source: MIC e-Stat / Auto-updated monthly</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Headline CPI (Y/Y)</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#111' }}>{latest ? latest.value.toFixed(1) : '--'}</div>
          <div style={{ fontSize: '12px', color: diff > 0 ? '#1D9E75' : '#E24B4A', marginTop: '3px' }}>{diffStr} vs prior</div>
        </div>
        <div style={{ background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase' }}>Latest period</div>
          <div style={{ fontSize: '24px', fontWeight: '600', color: '#111' }}>{latest ? latest.date : '--'}</div>
          <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>National, all items</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>Headline CPI trend</div>
        <div style={{ position: 'relative', height: '280px' }}>
          <canvas id="cpichart"></canvas>
        </div>
      </div>
    </main>
  )
}
