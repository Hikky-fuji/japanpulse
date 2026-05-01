'use client'
import React, { useEffect, useState } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

export default function USEmploymentPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/us-employment')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(String(e)))
  }, [])

  if (error) return <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#E24B4A' }}>Error: {error}</div>
  if (!data)  return <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading US Employment data…</div>

  const { employment, sectors, sectorAhe } = data
  const { payems, unrate, u6rate, civpart, prime_part, ahe } = employment

  // ── helpers ──────────────────────────────────────────────────────────
  const lat   = arr => arr?.length ? arr[arr.length - 1] : null
  const momDiff = arr => arr?.length >= 2 ? arr[arr.length-1].value - arr[arr.length-2].value : null
  const momPct  = arr => arr?.length >= 2 ? (arr[arr.length-1].value / arr[arr.length-2].value - 1) * 100 : null
  const yoyVal  = arr => arr?.length >= 13 ? (arr[arr.length-1].value / arr[arr.length-13].value - 1) * 100 : null

  const fmtK    = v => v != null ? (v >= 0 ? '+' : '') + Math.round(v) + 'K' : '--'
  const fmtPct  = (v, d=2) => v != null ? v.toFixed(d) + '%' : '--'
  const fmtSign = (v, d=2, sfx='%') => v != null ? (v>=0?'+':'') + v.toFixed(d) + sfx : '--'
  const dc      = v => v == null ? '#888' : v >= 0 ? '#1D9E75' : '#E24B4A'
  const dcInv   = v => v == null ? '#888' : v <= 0 ? '#1D9E75' : '#E24B4A'

  // ── Sector defs (for highlight table) ────────────────────────────────
  const sectorRows = [
    { key: 'goods',        label: 'Goods Producing',    indent: false, aheKey: 'goods' },
    { key: 'construction', label: '  Construction',     indent: true,  aheKey: 'construction' },
    { key: 'wholesale',    label: '  Wholesale',        indent: true,  aheKey: 'wholesale' },
    { key: 'retail',       label: '  Retail Trade',     indent: true,  aheKey: 'retail' },
    { key: 'info',         label: '  Information',      indent: true,  aheKey: 'info' },
    { key: 'fire',         label: '  Financial',        indent: true,  aheKey: 'finance' },
    { key: 'pbs',          label: '  Prof. & Bus.',     indent: true,  aheKey: 'professional' },
    { key: 'ehs',          label: '  Edu & Health',     indent: true,  aheKey: 'eduHealth' },
    { key: 'lah',          label: '  Leisure & Hosp.', indent: true,  aheKey: 'leisure' },
    { key: 'govt',         label: 'Government',         indent: false, aheKey: null },
  ]

  // 3-month window: last 3 M/M changes → need 4 observations
  const get3mChanges = arr => {
    if (!arr || arr.length < 4) return [null, null, null]
    const s = arr.slice(-4)
    return [s[1].value - s[0].value, s[2].value - s[1].value, s[3].value - s[2].value]
  }
  const get3mMoMPct = arr => {
    if (!arr || arr.length < 4) return [null, null, null]
    const s = arr.slice(-4)
    return [
      (s[1].value / s[0].value - 1) * 100,
      (s[2].value / s[1].value - 1) * 100,
      (s[3].value / s[2].value - 1) * 100,
    ]
  }

  const nfp3months = payems?.length >= 4 ? payems.slice(-4) : []
  const m3labels = nfp3months.slice(1).map(v => {
    const d = new Date(v.date + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  })

  const nfp3changes   = get3mChanges(payems)
  const aheMoM3       = get3mMoMPct(ahe)
  const aheYoY3 = ahe?.length >= 14
    ? [
        (ahe[ahe.length-3].value / ahe[ahe.length-15].value - 1) * 100,
        (ahe[ahe.length-2].value / ahe[ahe.length-14].value - 1) * 100,
        (ahe[ahe.length-1].value / ahe[ahe.length-13].value - 1) * 100,
      ]
    : [null, null, null]
  const unr3  = unrate?.slice(-3).map(v => v.value) ?? [null, null, null]
  const civ3  = civpart?.slice(-3).map(v => v.value) ?? [null, null, null]

  // ── NFP 12M bar ──────────────────────────────────────────────────────
  const nfp13    = payems?.length >= 13 ? payems.slice(-13) : []
  const nfp12Lbs = nfp13.slice(1).map(v => v.date.slice(0, 7))
  const nfp12Vls = nfp13.slice(1).map((v, i) => v.value - nfp13[i].value)

  // ── Sector employment change bar (latest month, horizontal) ──────────
  const barSectorDefs = [
    { key: 'goods',        label: 'Goods Prod.',    group: 'goods' },
    { key: 'construction', label: 'Construction',   group: 'goods' },
    { key: 'wholesale',    label: 'Wholesale',       group: 'highSvc' },
    { key: 'retail',       label: 'Retail',          group: 'highSvc' },
    { key: 'info',         label: 'Information',     group: 'highSvc' },
    { key: 'fire',         label: 'Financial',       group: 'highSvc' },
    { key: 'pbs',          label: 'Prof. & Bus.',    group: 'highSvc' },
    { key: 'ehs',          label: 'Edu & Health',    group: 'lowSvc' },
    { key: 'lah',          label: 'Leisure & Hosp.', group: 'lowSvc' },
    { key: 'govt',         label: 'Government',      group: 'govt' },
  ]
  const groupColors = { goods: '#378ADD', highSvc: '#1D9E75', lowSvc: '#9B59B6', govt: '#F5A623' }
  const sectorLatestChg = barSectorDefs.map(d => momDiff(sectors[d.key]) ?? 0)
  const sectorBarColors = barSectorDefs.map(d => {
    const v = momDiff(sectors[d.key]) ?? 0
    return v >= 0 ? groupColors[d.group] + 'CC' : 'rgba(226,75,74,0.75)'
  })

  // ── AHE by sector (horizontal bar, Y/Y) ─────────────────────────────
  const aheSectorDefs = [
    { key: 'goods',        label: 'Goods Prod.' },
    { key: 'construction', label: 'Construction' },
    { key: 'wholesale',    label: 'Wholesale' },
    { key: 'retail',       label: 'Retail' },
    { key: 'info',         label: 'Information' },
    { key: 'finance',      label: 'Financial' },
    { key: 'professional', label: 'Prof. Services' },
    { key: 'eduHealth',    label: 'Edu & Health' },
    { key: 'leisure',      label: 'Leisure & Hosp.' },
  ]
  const aheYoYs = aheSectorDefs.map(d => yoyVal(sectorAhe[d.key]) ?? 0)

  // ── Employment by sector donut (latest, grouped) ─────────────────────
  const donutGroups = [
    { label: 'Goods Producing', color: '#378ADD', keys: ['goods'] },
    { label: 'High Income Svc', color: '#1D9E75', keys: ['info', 'fire', 'pbs', 'wholesale'] },
    { label: 'Low Income Svc',  color: '#9B59B6', keys: ['ehs', 'lah', 'retail'] },
    { label: 'Government',      color: '#F5A623', keys: ['govt'] },
  ]
  const donutVals = donutGroups.map(g =>
    g.keys.reduce((sum, k) => sum + (lat(sectors[k])?.value ?? 0), 0)
  )
  const totalEmp = donutVals.reduce((a, b) => a + b, 0)

  // ── U3 / U6 24M ──────────────────────────────────────────────────────
  const unr24   = unrate?.slice(-24) || []
  const u6_24   = u6rate?.slice(-24) || []
  const unrLbls = unr24.map(v => v.date.slice(0, 7))

  // ── Labor participation 24M ───────────────────────────────────────────
  const civ24   = civpart?.slice(-24) || []
  const prm24   = prime_part?.slice(-24) || []
  const civLbls = civ24.map(v => v.date.slice(0, 7))

  // ── Cumulative employment since Jan 2022 ─────────────────────────────
  const refIdx = payems?.findIndex(v => v.date.slice(0, 7) === '2022-01') ?? -1
  const cumData  = refIdx >= 0 ? payems.slice(refIdx).map(v => v.value - payems[refIdx].value) : []
  const cumLabels = refIdx >= 0 ? payems.slice(refIdx).map(v => v.date.slice(0, 7)) : []

  // ── Styles ───────────────────────────────────────────────────────────
  const s = {
    wrap:     { maxWidth: '1060px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' },
    sec:      { fontSize: '11px', fontWeight: '700', color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 0 6px', marginTop: '24px', borderBottom: '2px solid #ddeeff', marginBottom: '14px' },
    grid4:    { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' },
    grid2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    card:     { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLbl:  { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:  { fontSize: '22px', fontWeight: '600', color: '#111' },
    cardSub:  { fontSize: '11px', marginTop: '3px' },
    box:      { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle: { fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#333' },
    boxSub:   { fontSize: '10px', color: '#aaa', marginBottom: '10px' },
    table:    { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    th:       { textAlign: 'right', padding: '5px 10px', color: '#888', fontWeight: '500', borderBottom: '1px solid #eee', fontSize: '11px' },
    thL:      { textAlign: 'left',  padding: '5px 10px', color: '#888', fontWeight: '500', borderBottom: '1px solid #eee', fontSize: '11px' },
    td:       { padding: '4px 10px', borderBottom: '1px solid #f5f5f5' },
    tdR:      { padding: '4px 10px', borderBottom: '1px solid #f5f5f5', textAlign: 'right' },
  }

  const lineOpts = {
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: { y: { ticks: { callback: v => v.toFixed(1) + '%' } } },
  }

  const nfpBarOpts = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false, callbacks: { label: ctx => (ctx.parsed.y >= 0 ? '+' : '') + Math.round(ctx.parsed.y) + 'K' } },
    },
    scales: { y: { ticks: { callback: v => (v >= 0 ? '+' : '') + Math.round(v) + 'K' } } },
  }

  const hbarEmpOpts = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => (ctx.parsed.x >= 0 ? '+' : '') + Math.round(ctx.parsed.x) + 'K' } },
    },
    scales: { x: { ticks: { callback: v => (v >= 0 ? '+' : '') + Math.round(v) + 'K' } } },
  }

  const hbarWageOpts = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(2) + '%' } },
    },
    scales: { x: { ticks: { callback: v => v.toFixed(1) + '%' } } },
  }

  const doughnutOpts = {
    responsive: true,
    plugins: {
      legend: { position: 'right', labels: { font: { size: 11 }, padding: 10 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${(ctx.raw / 1000).toFixed(1)}M` } },
    },
  }

  const cumOpts = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false, callbacks: { label: ctx => (ctx.parsed.y >= 0 ? '+' : '') + Math.round(ctx.parsed.y) + 'K' } },
    },
    scales: { y: { ticks: { callback: v => (v >= 0 ? '+' : '') + (v / 1000).toFixed(1) + 'M' } } },
  }

  const cellColor = v => v == null ? '#888' : v >= 0 ? '#1D9E75' : '#E24B4A'

  return (
    <main style={s.wrap}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>
            <a href="/" style={{ color: '#aaa', textDecoration: 'none' }}>🇯🇵 Japan</a>
            {' → '}
            <a href="/us" style={{ color: '#aaa', textDecoration: 'none' }}>🇺🇸 US</a>
            {' → Employment'}
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>
            US Employment Dashboard
          </h1>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>
            BLS via FRED · SA · Monthly
          </div>
        </div>
        <a href="/us" style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>← US Home</a>
      </div>

      {/* ── Section 1: Headline KPIs ── */}
      <div style={s.sec}>Headline</div>
      <div style={s.grid4}>
        {[
          { label: 'NFP M/M Change (SA)',         val: fmtK(momDiff(payems)),   sub: nfp3changes[1] != null ? 'Prior: ' + fmtK(nfp3changes[1]) : '', color: dc(momDiff(payems)) },
          { label: 'Unemployment U-3 (SA)',        val: fmtPct(lat(unrate)?.value, 1), sub: unrate?.length >= 2 ? fmtSign(lat(unrate).value - unrate[unrate.length-2].value, 1, 'pp') + ' vs prior' : '', color: dcInv(momDiff(unrate)) },
          { label: 'Broad Unemployment U-6 (SA)', val: fmtPct(lat(u6rate)?.value, 1), sub: u6rate?.length >= 2  ? fmtSign(lat(u6rate).value - u6rate[u6rate.length-2].value, 1, 'pp') + ' vs prior' : '',  color: dcInv(momDiff(u6rate)) },
          { label: 'AHE YoY — All Private (SA)',  val: fmtPct(yoyVal(ahe)),     sub: 'M/M: ' + fmtSign(momPct(ahe), 2), color: dc(yoyVal(ahe)) },
        ].map(k => (
          <div key={k.label} style={s.card}>
            <div style={s.cardLbl}>{k.label}</div>
            <div style={s.cardVal}>{k.val}</div>
            <div style={{ ...s.cardSub, color: k.color }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Section 2: Highlight Table + NFP 12M bar ── */}
      <div style={s.sec}>Establishment Survey — Last 3 Months</div>
      <div style={s.grid2}>

        {/* Highlight Table */}
        <div style={s.box}>
          <div style={s.boxTitle}>Employment Change by Sector (K, SA)</div>
          <div style={s.boxSub}>Level M/M difference · FRED</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thL}>Sector</th>
                {m3labels.map(m => <th key={m} style={s.th}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {sectorRows.map(row => {
                const changes = get3mChanges(sectors[row.key])
                return (
                  <tr key={row.key}>
                    <td style={{ ...s.td, fontWeight: row.indent ? '400' : '600', color: row.indent ? '#555' : '#111' }}>
                      {row.label}
                    </td>
                    {changes.map((v, i) => (
                      <td key={i} style={{ ...s.tdR, color: cellColor(v), fontWeight: '500' }}>
                        {v != null ? (v >= 0 ? '+' : '') + Math.round(v) : '--'}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* AHE table */}
        <div style={s.box}>
          <div style={s.boxTitle}>Avg Hourly Earnings — M/M % Change (SA)</div>
          <div style={s.boxSub}>CES series · FRED</div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.thL}>Series</th>
                {m3labels.map(m => <th key={m} style={s.th}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...s.td, fontWeight: '600' }}>AHE M/M (All Private)</td>
                {aheMoM3.map((v, i) => (
                  <td key={i} style={{ ...s.tdR, color: cellColor(v), fontWeight: '600' }}>
                    {v != null ? fmtSign(v, 2) : '--'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ ...s.td, fontWeight: '600' }}>AHE Y/Y (All Private)</td>
                {aheYoY3.map((v, i) => (
                  <td key={i} style={{ ...s.tdR, color: '#333', fontWeight: '600' }}>
                    {v != null ? fmtPct(v) : '--'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ ...s.td, color: '#aaa' }} colSpan={4}>&nbsp;</td>
              </tr>
              <tr>
                <td style={{ ...s.td, fontWeight: '600' }}>Unemployment (U-3)</td>
                {unr3.map((v, i) => (
                  <td key={i} style={{ ...s.tdR, fontWeight: '500' }}>
                    {v != null ? v.toFixed(1) + '%' : '--'}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ ...s.td, fontWeight: '600' }}>Labor Participation</td>
                {civ3.map((v, i) => (
                  <td key={i} style={{ ...s.tdR, fontWeight: '500' }}>
                    {v != null ? v.toFixed(1) + '%' : '--'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: NFP 12M bar + Sector bar ── */}
      <div style={s.sec}>Employment Change</div>
      <div style={s.box}>
        <div style={s.boxTitle}>NFP Monthly Change — Last 12 Months (K, SA)</div>
        <div style={s.boxSub}>SA · PAYEMS M/M level difference (FRED)</div>
        <Bar
          data={{
            labels: nfp12Lbs,
            datasets: [{
              label: 'NFP Change (K)',
              data:  nfp12Vls,
              backgroundColor: nfp12Vls.map(v => v >= 0 ? 'rgba(55,138,221,0.75)' : 'rgba(226,75,74,0.75)'),
            }],
          }}
          options={nfpBarOpts}
        />
      </div>

      <div style={s.grid2}>
        {/* Sector employment change — latest month horizontal bar */}
        <div style={s.box}>
          <div style={s.boxTitle}>Sector Employment Change — Latest Month (K, SA)</div>
          <div style={s.boxSub}>Blue = Goods · Green = High Inc. Svc · Purple = Low Inc. Svc · Orange = Govt</div>
          <Bar
            data={{
              labels: barSectorDefs.map(d => d.label),
              datasets: [{
                data: sectorLatestChg,
                backgroundColor: sectorBarColors,
              }],
            }}
            options={hbarEmpOpts}
          />
        </div>

        {/* Employment by sector donut */}
        <div style={s.box}>
          <div style={s.boxTitle}>Employment by Sector — Latest Month</div>
          <div style={s.boxSub}>
            SA · Total: {totalEmp > 0 ? (totalEmp / 1000).toFixed(1) + 'M' : '--'} · Grouped sectors (FRED)
          </div>
          <Doughnut
            data={{
              labels: donutGroups.map(g => g.label),
              datasets: [{
                data: donutVals,
                backgroundColor: donutGroups.map(g => g.color + 'CC'),
                borderWidth: 2,
                borderColor: '#fff',
              }],
            }}
            options={doughnutOpts}
          />
        </div>
      </div>

      {/* ── Section 4: Wage Growth by Sector ── */}
      <div style={s.sec}>Wage Growth by Sector (AHE YoY)</div>
      <div style={s.box}>
        <div style={s.boxTitle}>Average Hourly Earnings — Year-over-Year % by Sector (SA)</div>
        <div style={s.boxSub}>SA · CES sector series (FRED) · YoY calculated client-side</div>
        <Bar
          data={{
            labels: aheSectorDefs.map(d => d.label),
            datasets: [{
              data: aheYoYs,
              backgroundColor: aheYoYs.map(v => v >= 0 ? 'rgba(29,158,117,0.75)' : 'rgba(226,75,74,0.75)'),
            }],
          }}
          options={hbarWageOpts}
        />
      </div>

      {/* ── Section 5: Household Survey ── */}
      <div style={s.sec}>Household Survey</div>
      <div style={s.grid2}>

        {/* U3 / U6 line */}
        <div style={s.box}>
          <div style={s.boxTitle}>Unemployment Rate U-3 vs U-6 (24M)</div>
          <div style={s.boxSub}>SA · UNRATE / U6RATE (FRED)</div>
          <Line
            data={{
              labels: unrLbls,
              datasets: [
                { label: 'U-3 (Headline)', data: unr24.map(v => v.value), borderColor: '#378ADD', borderWidth: 2, pointRadius: 0, tension: 0.3 },
                { label: 'U-6 (Broad)',    data: u6_24.map(v => v.value), borderColor: '#D85A30', borderWidth: 2, pointRadius: 0, tension: 0.3 },
              ],
            }}
            options={lineOpts}
          />
        </div>

        {/* Participation rate line */}
        <div style={s.box}>
          <div style={s.boxTitle}>Labor Force Participation Rate (24M)</div>
          <div style={s.boxSub}>SA · CIVPART / LNS11300060 (FRED)</div>
          <Line
            data={{
              labels: civLbls,
              datasets: [
                { label: 'Overall (16+)',   data: civ24.map(v => v.value), borderColor: '#1D9E75', borderWidth: 2, pointRadius: 0, tension: 0.3 },
                { label: 'Prime Age 25-54', data: prm24.map(v => v.value), borderColor: '#9B59B6', borderWidth: 2, pointRadius: 0, tension: 0.3 },
              ],
            }}
            options={lineOpts}
          />
        </div>
      </div>

      {/* ── Section 6: Cumulative Employment Growth ── */}
      <div style={s.sec}>Cumulative Employment Growth Since Jan 2022</div>
      <div style={s.box}>
        <div style={s.boxTitle}>Cumulative Nonfarm Payroll Change Since January 2022 (K, SA)</div>
        <div style={s.boxSub}>SA · PAYEMS (FRED) · Base = 0 at Jan 2022</div>
        {cumData.length > 0 ? (
          <Line
            data={{
              labels: cumLabels,
              datasets: [{
                label: 'Cumulative Change',
                data:  cumData,
                borderColor: '#378ADD',
                backgroundColor: 'rgba(55,138,221,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: true,
              }],
            }}
            options={cumOpts}
          />
        ) : (
          <div style={{ color: '#aaa', fontSize: 13, padding: '20px 0' }}>Not enough data to compute cumulative series.</div>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #eee', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
        Data: FRED (Federal Reserve Bank of St. Louis) · BLS · SA · Personal use only
      </div>
    </main>
  )
}
