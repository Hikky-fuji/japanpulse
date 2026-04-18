'use client'
import { useEffect, useState, useRef } from 'react'

export default function Home() {
  const [data, setData] = useState(null)
  const chartRef = useRef(null)

  useEffect(() => {
    fetch('/api/cpi').then(r => r.json()).then(setData)
  }, [])

  useEffect(() => {
    if (!data) return
    if (typeof window === 'undefined') return

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
    script.onload = () => drawChart(data)
    document.head.appendChild(script)
  }, [data])

  const drawChart = (d) => {
    if (chartRef.current && chartRef.current._chart) {
      chartRef.current._chart.destroy()
    }
    const ctx = document.getElementById('cpichart')
    if (!ctx) return
    const chart = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: d.headline.map(v => v.date),
        datasets: [
          { label: '総合',     data: d.headline.map(v=>v.value), borderColor:'#378ADD', borderWidth:2, pointRadius:0, tension:0.3 },
          { label: 'コア',     data: d.core.map(v=>v.value),     borderColor:'#D85A30', borderWidth:2, pointRadius:0, tension:0.3 },
          { label: 'コアコア', data: d.corecore.map(v=>v.value), borderColor:'#1D9E75', borderWidth:2, pointRadius:0, tension:0.3 },
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: { y: { ticks: { callback: v => v + '%' } } }
      }
    })
    if (chartRef.current) chartRef.current._chart = chart
  }

  if (!data) return (
    <div style={{padding:'40px', fontFamily:'sans-serif', color:'#666'}}>
      データを読み込み中...
    </div>
  )

  const latest     = data.headline.at(-1)
  const prev       = data.headline.at(-2)
  const latestCore = data.core.at(-1)
  const prevCore   = data.core.at(-2)
  const latestCC   = data.corecore.at(-1)
  const prevCC     = data.corecore.at(-2)

  const delta = (a, b) => {
    const d = (a.value - b.value).toFixed(1)
    return d > 0 ? `+${d}pp` : `${d}pp`
  }

  return (
    <main style={{maxWidth:'900px', margin:'0 auto', padding:'24px', fontFamily:'sans-serif'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'12px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'600', color:'#111'}}>日本 CPI ダッシュボード</h1>
        <span style={{fontSize:'12px', color:'#888'}}>データ: 総務省 e-Stat / 自動更新</span>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'12px', marginBottom:'24px'}}>
        {[
          { label:'総合 (Y/Y)',             val: latest.value,     d: delta(latest, prev)          },
          { label:'コア (除く生鮮)',         val: latestCore.value, d: delta(latestCore, prevCore)  },
          { label:'コアコア (除く食・エネ)', val: latestCC.value,   d: delta(latestCC, prevCC)      },
        ].map(k => (
          <div key={k.label} style={{background:'#f8f8f6', borderRadius:'10px', padding:'14px 16px'}}>
            <div style={{fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em'}}>{k.label}</div>
            <div style={{fontSize:'24px', fontWeight:'600', color:'#111'}}>{k.val.toFixed(1)}%</div>
            <div style={{fontSize:'12px', color: k.d.startsWith('+') ? '#1D9E75' : '#E24B4A', marginTop:'3px'}}>{k.d} vs 前月</div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff', border:'1px solid #eee', borderRadius:'12px', padding:'16px'}}>
        <div style={{fontSize:'13px', fontWeight:'500', marginBottom:'12px'}}>総合 / コア / コアコア (Y/Y)</div>
        <canvas id="cpichart" ref={chartRef} style={{width:'100%', height:'280px'}}></canvas>
      </div>
    </main>
  )
}
