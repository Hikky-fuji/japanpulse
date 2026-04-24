'use client'
import { useEffect, useState, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

// Reuse HeatmapCell from IIP pattern
function HeatmapCell({ value }) {
  if (value == null) return <td style={{padding:'6px 8px', textAlign:'center', background:'#f5f5f5', fontSize:'11px', color:'#ccc'}}>—</td>
  const abs = Math.min(Math.abs(value), 30)
  const intensity = abs / 30
  const bg = value > 0
    ? `rgba(29,158,117,${0.15 + intensity * 0.7})`
    : `rgba(226,75,74,${0.15 + intensity * 0.7})`
  const color = intensity > 0.5 ? '#fff' : '#333'
  return (
    <td style={{padding:'6px 8px', textAlign:'center', background:bg, color, fontSize:'11px', fontWeight:'500'}}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}
    </td>
  )
}

// D3 World Map component (client-only, dynamic import)
function WorldMap({ byDest, year }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current || !Object.keys(byDest).length) return
    let cancelled = false

    const draw = async () => {
      const [d3mod, topomod, worldData] = await Promise.all([
        import('d3'),
        import('topojson-client'),
        import('world-atlas/countries-110m.json'),
      ])
      if (cancelled) return

      const d3 = d3mod
      const feature = topomod.feature
      const countries110m = worldData.default ?? worldData

      const el = svgRef.current
      const W = el.clientWidth || 700
      const H = Math.round(W * 0.5)
      el.setAttribute('viewBox', `0 0 ${W} ${H}`)

      // Clean up
      while (el.firstChild) el.removeChild(el.firstChild)
      const svg = d3.select(el)

      const projection = d3.geoNaturalEarth1()
        .rotate([-138, -10])
        .fitSize([W, H], { type: 'Sphere' })
      const path = d3.geoPath().projection(projection)

      // Ocean
      svg.append('path')
        .datum({ type: 'Sphere' })
        .attr('d', path)
        .attr('fill', '#EEF4FB')
        .attr('stroke', '#cdd9e5')
        .attr('stroke-width', 0.5)

      // Countries
      const geoFeatures = feature(countries110m, countries110m.objects.countries).features
      svg.selectAll('.country')
        .data(geoFeatures)
        .join('path')
        .attr('d', path)
        .attr('fill', '#D8DDE2')
        .attr('stroke', '#fff')
        .attr('stroke-width', 0.4)

      // Arrow markers
      const defs = svg.append('defs')
      for (const [id, clr] of [['arrG', '#1D9E75'], ['arrR', '#E24B4A']]) {
        defs.append('marker')
          .attr('id', id)
          .attr('viewBox', '0 0 10 6')
          .attr('refX', 9).attr('refY', 3)
          .attr('markerWidth', 6).attr('markerHeight', 6)
          .attr('orient', 'auto')
          .append('path').attr('d', 'M0,0 L10,3 L0,6 Z').attr('fill', clr)
      }

      // Trading partner geographic centers
      const partnerCoords = {
        USA:        [-98,  39],
        China:      [105,  35],
        Korea:      [128,  36],
        EU:         [10,   51],
        ASEAN:      [112,   5],
        MiddleEast: [45,   25],
      }

      const japanXY = projection([137, 36])
      if (!japanXY) return

      const tooltip = d3.select('body').selectAll('.trade-tooltip').data([1]).join('div')
        .attr('class', 'trade-tooltip')
        .style('position', 'fixed')
        .style('background', 'rgba(0,0,0,0.75)')
        .style('color', '#fff')
        .style('padding', '6px 10px')
        .style('border-radius', '6px')
        .style('font-size', '11px')
        .style('pointer-events', 'none')
        .style('display', 'none')

      // Draw arcs per trading partner
      for (const [country, destData] of Object.entries(byDest)) {
        const coord = partnerCoords[country]
        if (!coord) continue
        const pXY = projection(coord)
        if (!pXY) continue

        // Use latest year data
        const netLatest = destData.net?.at(-1)?.value ?? 0
        const expLatest = destData.export?.at(-1)?.value ?? 0
        const impLatest = destData.import?.at(-1)?.value ?? 0
        if (netLatest === 0 && expLatest === 0) continue

        const isDeficit = netLatest < 0
        const magnitude = Math.abs(netLatest)
        const strokeW = Math.max(1, Math.min(10, magnitude / 1e6))  // scale: 1 unit = ¥1T equiv
        const color = isDeficit ? '#E24B4A' : '#1D9E75'
        const markerId = isDeficit ? 'arrR' : 'arrG'

        // Arrow from surplus-country → Japan, or Japan → deficit-country
        const [x1, y1] = isDeficit ? japanXY : pXY
        const [x2, y2] = isDeficit ? pXY : japanXY

        // Quadratic bezier with upward control point
        const cx = (x1 + x2) / 2
        const cy = Math.min(y1, y2) - Math.abs(x2 - x1) * 0.25

        const arc = svg.append('path')
          .attr('d', `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', strokeW)
          .attr('stroke-opacity', 0.75)
          .attr('marker-end', `url(#${markerId})`)
          .style('cursor', 'pointer')

        arc.on('mouseover', (e) => {
          const toT = v => (v / 1e9).toFixed(1)
          tooltip
            .style('display', 'block')
            .style('left', (e.clientX + 12) + 'px')
            .style('top', (e.clientY - 28) + 'px')
            .html(`<b>${country}</b><br>Export ¥${toT(expLatest)}T · Import ¥${toT(impLatest)}T<br>Net ${netLatest >= 0 ? '+' : ''}¥${toT(netLatest)}T`)
        })
        arc.on('mouseleave', () => tooltip.style('display', 'none'))
      }

      // Japan marker
      svg.append('circle')
        .attr('cx', japanXY[0]).attr('cy', japanXY[1])
        .attr('r', 7).attr('fill', '#378ADD').attr('stroke', '#fff').attr('stroke-width', 1.5)

      svg.append('text')
        .attr('x', japanXY[0] + 10).attr('y', japanXY[1] + 4)
        .attr('font-size', '11px').attr('fill', '#378ADD').attr('font-weight', '600')
        .text('Japan')
    }

    draw().catch(console.error)
    return () => { cancelled = true }
  }, [byDest, year])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    />
  )
}

export default function Trade() {
  const [data, setData] = useState(null)
  const [chartMode, setChartMode] = useState('country')  // 'country' | 'product'

  useEffect(() => {
    fetch('/api/trade').then(r => r.json()).then(setData)
  }, [])

  if (!data?.months?.length) return (
    <div style={{padding:'40px', fontFamily:'sans-serif', color:'#666'}}>Loading...</div>
  )

  const { months, export: exp, import: imp, byDest } = data

  // Unit conversion: e-Stat values are in 千円 → convert to 兆円 for display
  const toT = v => v / 1e9

  const latestExp   = exp.total?.at(-1)?.value ?? 0
  const latestImp   = imp.total?.at(-1)?.value ?? 0
  const balance     = latestExp - latestImp
  const prevExp     = exp.total?.at(-13)?.value ?? 0
  const expYoY      = prevExp ? ((latestExp - prevExp) / Math.abs(prevExp)) * 100 : null
  const latestMonth = months.at(-1) ?? '—'

  // Y/Y helper for heatmap
  const yoy = (series, date) => {
    const curr = series?.find(v => v.date === date)
    const [yr, mn] = date.split('/')
    const prevDate = `${parseInt(yr) - 1}/${mn}`
    const prev = series?.find(v => v.date === prevDate)
    if (!curr || !prev || prev.value === 0) return null
    return ((curr.value - prev.value) / Math.abs(prev.value)) * 100
  }

  // Stacked bar chart — Country mode
  const destColors = {
    USA:   '#378ADD', China: '#E24B4A', Korea: '#1D9E75',
    EU:    '#9B59B6', ASEAN: '#D85A30', MiddleEast: '#F5A623',
  }
  const COUNTRIES_ORDERED = ['USA', 'China', 'Korea', 'EU', 'ASEAN', 'MiddleEast']

  // Net trade balance by country: positive = surplus (stacked above 0), negative = deficit (below 0)
  // Plus dashed total net line
  const totalNetData = months.map(d => {
    let sum = 0
    for (const c of COUNTRIES_ORDERED) {
      if (!byDest[c]) continue
      const v = byDest[c].net?.find(x => x.date === d)
      if (v) sum += v.value
    }
    return toT(sum)
  })

  const countryChart = {
    labels: months,
    datasets: [
      ...COUNTRIES_ORDERED.filter(c => byDest[c]).map(c => ({
        label: c,
        type: 'bar',
        data: months.map(d => {
          const v = byDest[c].net?.find(x => x.date === d)
          return v ? toT(v.value) : 0
        }),
        backgroundColor: destColors[c],
        stack: 'net',
      })),
      {
        label: 'Total Net',
        type: 'line',
        data: totalNetData,
        borderColor: '#333',
        borderWidth: 1.5,
        borderDash: [4, 3],
        pointRadius: 0,
        tension: 0.3,
        stack: undefined,
      },
    ]
  }


  // Product chart
  const prodColors = {
    auto: '#378ADD', semicon: '#1D9E75', machinery: '#9B59B6', chemicals: '#D85A30',
    crude_oil: '#E24B4A', lng: '#F5A623', food: '#95A5A6',
  }
  const productChart = {
    labels: months,
    datasets: [
      { label: 'Auto (exp)', data: months.map(d => { const v = exp.auto?.find(x => x.date === d); return v ? toT(v.value) : 0 }), backgroundColor: prodColors.auto, stack: 'exp' },
      { label: 'Electrical/Semicon (exp)', data: months.map(d => { const v = exp.semicon?.find(x => x.date === d); return v ? toT(v.value) : 0 }), backgroundColor: prodColors.semicon, stack: 'exp' },
      { label: 'Machinery (exp)', data: months.map(d => { const v = exp.machinery?.find(x => x.date === d); return v ? toT(v.value) : 0 }), backgroundColor: prodColors.machinery, stack: 'exp' },
      { label: 'Chemicals (exp)', data: months.map(d => { const v = exp.chemicals?.find(x => x.date === d); return v ? toT(v.value) : 0 }), backgroundColor: prodColors.chemicals, stack: 'exp' },
      { label: 'Crude Oil (imp)', data: months.map(d => { const v = imp.crude_oil?.find(x => x.date === d); return v ? -toT(v.value) : 0 }), backgroundColor: '#E24B4A88', stack: 'imp' },
      { label: 'LNG (imp)', data: months.map(d => { const v = imp.lng?.find(x => x.date === d); return v ? -toT(v.value) : 0 }), backgroundColor: '#F5A62388', stack: 'imp' },
      { label: 'Food (imp)', data: months.map(d => { const v = imp.food?.find(x => x.date === d); return v ? -toT(v.value) : 0 }), backgroundColor: '#95A5A688', stack: 'imp' },
    ]
  }

  const stackedOpts = {
    responsive: true,
    plugins: { legend: { position: 'top', labels: { font: { size: 10 } } }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { stacked: true, ticks: { maxTicksLimit: 12 } },
      y: { stacked: true, ticks: { callback: v => v.toFixed(1) + '兆' }, grid: { color: ctx => ctx.tick.value === 0 ? '#999' : '#eee' } }
    }
  }
  // Heatmap data
  const heatMonths = months.slice(-12)
  const heatRows = [
    { label: 'Auto (exp)',          series: exp.auto },
    { label: 'Electrical (exp)',    series: exp.semicon },
    { label: 'Machinery (exp)',     series: exp.machinery },
    { label: 'Chemicals (exp)',     series: exp.chemicals },
    { label: 'Crude Oil (imp)',     series: imp.crude_oil },
    { label: 'LNG (imp)',           series: imp.lng },
    { label: 'Food (imp)',          series: imp.food },
  ]

  const s = {
    wrap:      { maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' },
    nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
    grid4:     { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' },
    card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:   { fontSize: '22px', fontWeight: '600', color: '#111' },
    box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
    note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
    table:     { width: '100%', borderCollapse: 'collapse' },
    th:        { padding: '6px 8px', background: '#f8f8f6', fontWeight: '600', fontSize: '10px', color: '#888', textAlign: 'center', borderBottom: '1px solid #eee' },
    thLeft:    { padding: '6px 8px', background: '#f8f8f6', fontWeight: '600', fontSize: '10px', color: '#888', textAlign: 'left', borderBottom: '1px solid #eee' },
    tdLabel:   { padding: '6px 8px', fontSize: '11px', fontWeight: '500', color: '#333', whiteSpace: 'nowrap', borderBottom: '1px solid #f5f5f5' },
    toggleBtn: (active) => ({
      padding: '5px 12px', fontSize: '11px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ddd',
      background: active ? '#378ADD' : '#fff', color: active ? '#fff' : '#555', fontWeight: active ? '600' : '400',
    }),
  }

  const kpiColor = v => v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'
  const fmt2 = v => v != null ? `${v > 0 ? '+' : ''}${v.toFixed(1)}` : '—'

  return (
    <main style={s.wrap}>
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/iip" style={s.nav}>IIP</a>
          <a href="/consumption" style={s.nav}>Consumption</a>
          <span style={{fontSize:'20px', fontWeight:'600', color:'#111'}}>Japan Trade Statistics</span>
        </div>
        <span style={{fontSize:'12px', color:'#888'}}>Source: MOF / e-Stat · Latest: {latestMonth}</span>
      </div>

      {/* ① KPI Cards */}
      <div style={s.grid4}>
        <div style={s.card}>
          <div style={s.cardLabel}>Export (latest month)</div>
          <div style={s.cardVal}>¥{toT(latestExp).toFixed(1)}T</div>
          <div style={{fontSize:'11px', color: kpiColor(expYoY), marginTop:'3px'}}>
            Y/Y: {fmt2(expYoY)}%
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Import (latest month)</div>
          <div style={s.cardVal}>¥{toT(latestImp).toFixed(1)}T</div>
          <div style={{fontSize:'11px', color:'#888', marginTop:'3px'}}>{latestMonth}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Trade Balance</div>
          <div style={{fontSize:'22px', fontWeight:'600', color: kpiColor(balance)}}>
            {balance >= 0 ? '+' : ''}¥{toT(balance).toFixed(1)}T
          </div>
          <div style={{fontSize:'11px', color: kpiColor(balance), marginTop:'3px'}}>
            {balance >= 0 ? '▲ Surplus' : '▼ Deficit'}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Export Y/Y</div>
          <div style={{fontSize:'22px', fontWeight:'600', color: kpiColor(expYoY)}}>
            {fmt2(expYoY)}%
          </div>
          <div style={{fontSize:'11px', color:'#888', marginTop:'3px'}}>vs same month prior year</div>
        </div>
      </div>

      {/* ② Stacked Chart */}
      <div style={s.box}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
          <span style={s.boxTitle}>Trade by {chartMode === 'country' ? 'Destination/Origin' : 'Commodity'} — Export (+) / Import (−) 兆円</span>
          <div style={{display:'flex', gap:'6px'}}>
            <button style={s.toggleBtn(chartMode === 'country')} onClick={() => setChartMode('country')}>Country</button>
            <button style={s.toggleBtn(chartMode === 'product')} onClick={() => setChartMode('product')}>Product</button>
          </div>
        </div>
        <Bar data={chartMode === 'country' ? countryChart : productChart} options={stackedOpts} />
        <div style={s.note}>
          {chartMode === 'country'
            ? '※ Country mode: Net balance per country stacked (+ = surplus, − = deficit). Dashed line = total net.'
            : '※ Product mode: Export commodity stacked above 0, import commodity below 0.'}
        </div>
      </div>

      {/* ③ World Map */}
      <div style={s.box}>
        <div style={s.boxTitle}>Trade Flow Map — Net Balance Direction (Latest Month)</div>
        <div style={{background:'#f5f8fb', borderRadius:'8px', overflow:'hidden'}}>
          <WorldMap byDest={byDest} year={latestMonth} />
        </div>
        <div style={{display:'flex', gap:'16px', marginTop:'8px', fontSize:'11px', color:'#888'}}>
          <span style={{color:'#1D9E75'}}>● Surplus (→ Japan)</span>
          <span style={{color:'#E24B4A'}}>● Deficit (Japan →)</span>
          <span>Arrow width = net amount</span>
        </div>
        <div style={s.note}>※ Arrow direction: surplus flows toward Japan, deficit flows away. Hover for details.</div>
      </div>

      {/* ④ Commodity Y/Y Heatmap */}
      <div style={s.box}>
        <div style={s.boxTitle}>Commodity Y/Y % — Heatmap (Last 12 months)</div>
        <div style={{overflowX:'auto'}}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thLeft}>Item</th>
                {heatMonths.map(d => <th key={d} style={{...s.th, minWidth:'52px'}}>{d.slice(5)}</th>)}
              </tr>
            </thead>
            <tbody>
              {heatRows.map(row => (
                <tr key={row.label}>
                  <td style={s.tdLabel}>{row.label}</td>
                  {heatMonths.map((d, i) => <HeatmapCell key={i} value={yoy(row.series, d)} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={s.note}>Green = Y/Y positive, Red = Y/Y negative. Scale: ±30%</div>
      </div>
    </main>
  )
}
