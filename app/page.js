'use client'
import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Home() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/cpi')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(e.message))
  }, [])

  if (error) return <div style={{padding:'40px',color:'red'}}>Error: {error}</div>
  if (!data) return <div style={{padding:'40px',color:'#666'}}>Loading...</div>

  const latest = data.headline.at(-1)
  const prev = data.headline.at(-2)
  const diff = latest && prev ? (latest.value - prev.value).toFixed(1) : '0.0'
  const diffStr = Number(diff) > 0 ? `+${diff}pp` : `${diff}pp`

  const chartData = {
    labels: data.headline.map(v => v.date),
    datasets: [{
      label: 'Headline CPI',
      data: data.headline.map(v => v.value),
      borderColor: '#378ADD',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3
    }]
  }

  const options = {
    responsive: true,
    plugins: { legend: { position: 'top' } },
    scales: { y: { ticks: { callback: v => v.toFixed(1) } } }
  }

  return (
    <main style={{maxWidth:'900px',margin:'0 auto',padding:'24px',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'20px',borderBottom:'1px solid #eee',paddingBottom:'12px'}}>
        <h1 style={{fontSize:'20px',fontWeight:'600',color:'#111'}}>Japan CPI Dashboard</h1>
        <span style={{fontSize:'12px',color:'#888'}}>Source: MIC e-Stat / Auto-updated monthly</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'12px',marginBottom:'24px'}}>
        <div style={{background:'#f8f8f6',borderRadius:'10px',padding:'14px 16px'}}>
          <div style={{fontSize:'11px',color:'#888',marginBottom:'4px',textTransform:'uppercase'}}>Headline CPI (Index)</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:'#111'}}>{latest ? latest.value.toFixed(1) : '--'}</div>
          <div style={{fontSize:'12px',color: Number(diff) > 0 ? '#1D9E75' : '#E24B4A',marginTop:'3px'}}>{diffStr} vs prior</div>
        </div>
        <div style={{background:'#f8f8f6',borderRadius:'10px',padding:'14px 16px'}}>
          <div style={{fontSize:'11px',color:'#888',marginBottom:'4px',textTransform:'uppercase'}}>Latest period</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:'#111'}}>{latest ? latest.date : '--'}</div>
          <div style={{fontSize:'12px',color:'#888',marginTop:'3px'}}>Tokyo Metropolitan Area</div>
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #eee',borderRadius:'12px',padding:'16px'}}>
        <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'12px'}}>Headline CPI trend</div>
        <Line data={chartData} options={options} />
      </div>
    </main>
  )
}
