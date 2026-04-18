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

  useEffect(() => {
    fetch('/api/cpi').then(r => r.json()).then(setData)
  }, [])

  if (!data || !data.headline?.length) return (
    <div style={{padding:'40px',fontFamily:'sans-serif',color:'#666'}}>Loading...</div>
  )

  const latest = {
    headline: data.headline.at(-1),
    core: data.core.at(-1),
    corecore: data.corecore.at(-1),
  }
  const prev = {
    headline: data.headline.at(-2),
    core: data.core.at(-2),
    corecore: data.corecore.at(-2),
  }
  const diff = (a, b) => {
    const d = (a.value - b.value).toFixed(1)
    return { str: Number(d) > 0 ? `+${d}pp` : `${d}pp`, pos: Number(d) >= 0 }
  }

  const chartData = {
    labels: data.headline.map(v => v.date),
    datasets: [
      {
        label: 'Headline',
        data: data.headline.map(v => v.value),
        borderColor: '#378ADD',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Core (ex. Fresh Food)',
        data: data.core.map(v => v.value),
        borderColor: '#D85A30',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: 'Core-Core (ex. Food & Energy)',
        data: data.corecore.map(v => v.value),
        borderColor: '#1D9E75',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      y: { ticks: { callback: v => v.toFixed(1) + '%' } }
    }
  }

  const cards = [
    { label: 'Headline (Y/Y)', val: latest.headline.value, d: diff(latest.headline, prev.headline) },
    { label: 'Core ex. Fresh Food', val: latest.core.value, d: diff(latest.core, prev.core) },
    { label: 'Core-Core ex. Food & Energy', val: latest.corecore.value, d: diff(latest.corecore, prev.corecore) },
  ]

  return (
    <main style={{maxWidth:'900px',margin:'0 auto',padding:'24px',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:'20px',borderBottom:'1px solid #eee',paddingBottom:'12px'}}>
        <h1 style={{fontSize:'20px',fontWeight:'600',color:'#111'}}>Japan CPI Dashboard</h1>
        <span style={{fontSize:'12px',color:'#888'}}>Source: MIC e-Stat / Auto-updated monthly</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginBottom:'24px'}}>
        {cards.map(k => (
          <div key={k.label} style={{background:'#f8f8f6',borderRadius:'10px',padding:'14px 16px'}}>
            <div style={{fontSize:'11px',color:'#888',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'0.04em'}}>{k.label}</div>
            <div style={{fontSize:'24px',fontWeight:'600',color:'#111'}}>{k.val.toFixed(1)}%</div>
            <div style={{fontSize:'12px',color: k.d.pos ? '#1D9E75' : '#E24B4A',marginTop:'3px'}}>{k.d.str} vs prior month</div>
          </div>
        ))}
      </div>

      <div style={{background:'#fff',border:'1px solid #eee',borderRadius:'12px',padding:'16px'}}>
        <div style={{fontSize:'13px',fontWeight:'500',marginBottom:'12px'}}>Headline / Core / Core-Core (Y/Y %)</div>
        <Line data={chartData} options={options} />
      </div>
    </main>
  )
}
