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
  if (!data || !data.headline || data.headline.length === 0) return (
    <div style={{padding:'40px',color:'#666'}}>Loading...</div>
  )

  const latest = data.headline.at(-1)
  const prev = data.headline.at(-2)
  const diff = latest && prev ? (latest.value - prev.value).toFixed(1) : '0.0'
  const diffStr = Number(diff) > 0 ? `+${diff}` : `${diff}`

  const chartData = {
    labels: data.headline.map(v => v.date),
    datasets: [{
      label: 'Headline CPI (Index)',
      data: data.headline.map(v => v.value),
      borderColor: '#378ADD',
      backgroundColor: 'rgba(55,138,221,0.08)',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: true
    }]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: {
        ticks: { callback: v => v.toFixed(1) }
      }
    }
  }

  return (
    <main style={{maxWidth:'900px',margin:'0 auto',padding:'24px',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'20px',borderBottom:'1px solid #eee',paddingBottom:'12px'}}>
        <h1 style={{fontSize:'20px',fontWeight:'600',color:'#111'}}>Japan CPI Dashboard</h1>
        <span style={{fontSize:'12px',color:'#888'}}>Source: MIC e-Stat / Auto-updated monthly</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'24px'}}>
        <div style={{background:'#f8f8f6',borderRadius:'10px',padding:'14px 16px'}}>
          <div style={{fontSize:'11px',color:'#888',marginBottom:'4px',textTransform:'uppercase'}}>CPI Index (latest)</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:'#111'}}>{latest.value.toFixed(1)}</div>
          <div style={{fontSize:'12px',color: Number(diff) >= 0 ? '#1D9E75' : '#E24B4A',marginTop:'3px'}}>{diffStr} vs prior month</div>
        </div>
        <div style={{background:'#f8f8f6',borderRadius:'10px',padding:'14px 16px'}}>
          <div style={{fontSize:'11px',color:'#888',marginBottom:'4px',textTransform:'uppercase'}}>Latest period</div>
          <div style={{fontSize:'20px',fontWeight:'600',color:'#111'}}>{latest.date}</div>
          <div style={{fontSize:'12px',color:'#888',marginTop:'3px'}}>Tokyo Metropolitan Area</div>
        </div>
        <div style={{background:'#f8f8f6',borderRadius:'10px',padding:'14px 16px'}}>
          <div style={{fontSize:'11px',color:'#888',marginBottom:'4px',textTransform:'uppercase'}}>Data points</div>
          <div style={{fontSize:'24px',fontWeight:'600',color:'#111'}}>{data.headline.length}</div>
          <div style={{fontSize:'12px',color:'#888',marginTop:'3px'}}>Monthly observations</div>
        </div>
      </div>

      <div style={{background:'#fff',border:'1px solid #eee',borderRadius:'12px',padding:'16px'}}>
        <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'12px'}}>Headline CPI — Index level</div>
        <Line data={chartData} options={options} />
      </div>
    </main>
  )
}
