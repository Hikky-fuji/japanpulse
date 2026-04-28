'use client'
import { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const s = {
  wrap:      { maxWidth: '1100px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' },
  nav:       { fontSize: '12px', color: '#378ADD', textDecoration: 'none', marginRight: '16px' },
  grid3:     { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' },
  card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
  cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardVal:   { fontSize: '28px', fontWeight: '600' },
  cardSub:   { fontSize: '11px', color: '#888', marginTop: '3px' },
  box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#333' },
  boxDesc:   { fontSize: '11px', color: '#999', marginBottom: '12px', lineHeight: '1.6' },
  note:      { fontSize: '11px', color: '#aaa', marginTop: '10px', lineHeight: '1.7' },
  badge:     { display: 'inline-block', fontSize: '10px', background: '#DCFCE7', color: '#166534', borderRadius: '4px', padding: '2px 7px', marginLeft: '8px', fontWeight: '600' },
  insightBox:{ background: '#FFF8F0', border: '1px solid #FED7AA', borderRadius: '8px', padding: '10px 14px', marginTop: '10px', fontSize: '12px', color: '#7C3E0E', lineHeight: '1.7' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:        { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #eee', color: '#555', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' },
  td:        { padding: '8px 10px', borderBottom: '1px solid #f0f0f0' },
  tdNum:     { padding: '8px 10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  skeleton:  { background: '#f5f5f3', borderRadius: '8px' },
}

const diColor   = (v) => v == null ? '#888' : v >= 50 ? '#1D9E75' : '#E24B4A'
const diffColor = (v) => v == null ? '#888' : v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'
const fmtDiff   = (v) => v == null ? '--' : v > 0 ? `+${Math.abs(v).toFixed(1)}` : v < 0 ? `−${Math.abs(v).toFixed(1)}` : '0.0'
const fmtVal    = (v) => v?.toFixed(1) ?? '--'

const SKELETON_H = (h) => <div style={{ ...s.skeleton, height: h }} />

export default function Watcher() {
  const [watcher, setWatcher] = useState(null)
  const [nikkei,  setNikkei]  = useState(null)
  const [wErr,    setWErr]    = useState(null)
  const [nErr,    setNErr]    = useState(null)

  useEffect(() => {
    fetch('/api/watcher')
      .then(r => r.json())
      .then(d => { if (d.error) setWErr(d.error); else setWatcher(d) })
      .catch(e => setWErr(e.message))

    fetch('/api/nikkei')
      .then(r => r.json())
      .then(d => { if (d.error) setNErr(d.error); else setNikkei(d) })
      .catch(e => setNErr(e.message))
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────
  const cur  = watcher?.current_all ?? []
  const out  = watcher?.outlook_all ?? []
  const hh   = watcher?.current_hh  ?? []
  const corp = watcher?.current_corp ?? []
  const emp  = watcher?.current_emp  ?? []

  const latestCur = cur.at(-1)
  const prevCur   = cur.at(-2)
  const latestOut = out.at(-1)
  const prevOut   = out.at(-2)
  const curDiff   = latestCur && prevCur ? parseFloat((latestCur.value - prevCur.value).toFixed(1)) : null
  const outDiff   = latestOut && prevOut ? parseFloat((latestOut.value - prevOut.value).toFixed(1)) : null

  const latestSpread = latestCur && latestOut ? parseFloat((latestOut.value - latestCur.value).toFixed(1)) : null
  const prevSpread   = prevCur   && prevOut   ? parseFloat((prevOut.value  - prevCur.value).toFixed(1))   : null
  const spreadDiff   = latestSpread != null && prevSpread != null ? parseFloat((latestSpread - prevSpread).toFixed(1)) : null

  const latestDate = latestCur?.date ?? '...'

  // ── Chart 1: Long-term DI + Nikkei (dual Y) ─────────────────────────────
  const nikkeiMap  = Object.fromEntries((nikkei?.series ?? []).map(v => [v.date, v.value]))
  const dualLabels = cur.map(v => v.date)

  const dualData = {
    labels: dualLabels,
    datasets: [
      {
        label: 'Current DI',
        data: cur.map(v => v.value),
        borderColor: '#378ADD',
        borderWidth: 2.5,
        pointRadius: 2,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Outlook DI',
        data: dualLabels.map(d => out.find(v => v.date === d)?.value ?? null),
        borderColor: '#9B59B6',
        borderWidth: 2,
        pointRadius: 2,
        borderDash: [5, 4],
        tension: 0.3,
        spanGaps: false,
        yAxisID: 'y',
      },
      {
        label: 'DI = 50',
        data: dualLabels.map(() => 50),
        borderColor: '#ddd',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        yAxisID: 'y',
      },
      ...(nErr ? [] : [{
        label: 'Nikkei 225 (right)',
        data: dualLabels.map(d => nikkeiMap[d] ?? null),
        borderColor: '#E67E22',
        backgroundColor: 'rgba(230,126,34,0.05)',
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y2',
      }]),
    ],
  }

  const dualOpts = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { ticks: { maxTicksLimit: 12, maxRotation: 45 } },
      y: {
        type: 'linear', position: 'left',
        min: 30, max: 70,
        title: { display: true, text: 'DI', font: { size: 11 } },
        grid: { color: ctx => ctx.tick.value === 50 ? '#bbb' : '#f0f0f0' },
      },
      y2: {
        type: 'linear', position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Nikkei 225 (¥)', font: { size: 11 } },
      },
    },
  }

  // ── Chart 2: Spread (Outlook − Current) ──────────────────────────────────
  const spreadSeries = cur
    .map(v => {
      const o = out.find(u => u.date === v.date)
      if (!o) return null
      return { date: v.date, value: parseFloat((o.value - v.value).toFixed(1)) }
    })
    .filter(Boolean)

  const spreadData = {
    labels: spreadSeries.map(v => v.date),
    datasets: [{
      label: 'Outlook − Current DI Spread',
      data: spreadSeries.map(v => v.value),
      backgroundColor: spreadSeries.map(v => v.value >= 0 ? 'rgba(29,158,117,0.7)' : 'rgba(226,75,74,0.7)'),
      borderColor:     spreadSeries.map(v => v.value >= 0 ? '#1D9E75'               : '#E24B4A'),
      borderWidth: 1,
    }],
  }

  const spreadOpts = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { ticks: { maxTicksLimit: 12, maxRotation: 45 } },
      y: {
        title: { display: true, text: 'Spread (pts)' },
        grid: { color: ctx => ctx.tick.value === 0 ? '#aaa' : '#f0f0f0' },
      },
    },
  }

  // ── Chart 3: Sector trends (line) ────────────────────────────────────────
  const sectorLabels = cur.slice(-24).map(v => v.date)
  const hasSectors   = hh.length > 0 || corp.length > 0 || emp.length > 0

  const sectorData = {
    labels: sectorLabels,
    datasets: [
      {
        label: 'Total',
        data: cur.slice(-24).map(v => v.value),
        borderColor: '#378ADD', borderWidth: 2, pointRadius: 2, tension: 0.2,
      },
      ...(hh.length ? [{
        label: 'Household',
        data: sectorLabels.map(d => hh.find(v => v.date === d)?.value ?? null),
        borderColor: '#E67E22', borderWidth: 2, pointRadius: 2, tension: 0.2, spanGaps: false,
      }] : []),
      ...(corp.length ? [{
        label: 'Corporate',
        data: sectorLabels.map(d => corp.find(v => v.date === d)?.value ?? null),
        borderColor: '#1D9E75', borderWidth: 2, pointRadius: 2, tension: 0.2, spanGaps: false,
      }] : []),
      ...(emp.length ? [{
        label: 'Employment',
        data: sectorLabels.map(d => emp.find(v => v.date === d)?.value ?? null),
        borderColor: '#9B59B6', borderWidth: 2, pointRadius: 2, tension: 0.2, spanGaps: false,
      }] : []),
      {
        label: 'DI = 50',
        data: sectorLabels.map(() => 50),
        borderColor: '#ddd', borderWidth: 1, borderDash: [3, 3], pointRadius: 0,
      },
    ],
  }

  const sectorOpts = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' } },
    scales: {
      x: { ticks: { maxTicksLimit: 12, maxRotation: 45 } },
      y: {
        min: 30, max: 70,
        title: { display: true, text: 'DI' },
        grid: { color: ctx => ctx.tick.value === 50 ? '#bbb' : '#f0f0f0' },
      },
    },
  }

  // ── Trend table ──────────────────────────────────────────────────────────
  const tableRows = cur.slice(-12).reverse().map((v, i, arr) => {
    const prev   = arr[i + 1]
    const outVal = out.find(o => o.date === v.date)?.value ?? null
    const spread = outVal != null ? parseFloat((outVal - v.value).toFixed(1)) : null
    const diff   = prev ? parseFloat((v.value - prev.value).toFixed(1)) : null
    return { date: v.date, cur: v.value, out: outVal, spread, diff }
  })

  const fmtSpread = (v) => v == null ? '--' : v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)

  return (
    <main style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <a href="/" style={s.nav}>← Home</a>
          <a href="/tankan" style={s.nav}>Tankan</a>
          <a href="/cpi" style={s.nav}>CPI</a>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#111' }}>
            Economy Watchers Survey
            <span style={s.badge}>Monthly</span>
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>
          Source: Cabinet Office via e-Stat · Seasonally Adjusted · Latest: {latestDate}
        </span>
      </div>

      {wErr && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: '#B91C1C' }}>
          Error fetching Economy Watchers data: {wErr}
        </div>
      )}

      {/* ── Section 1: KPI Cards ── */}
      <div style={s.grid3}>
        <div style={s.card}>
          <div style={s.cardLabel}>Current Conditions DI (SA)</div>
          <div style={{ ...s.cardVal, color: diColor(latestCur?.value) }}>
            {watcher ? fmtVal(latestCur?.value) : SKELETON_H('36px')}
          </div>
          {watcher && <div style={s.cardSub}>
            M/M: <span style={{ color: diffColor(curDiff), fontWeight: '600' }}>{fmtDiff(curDiff)}</span>
            &ensp;prev: {fmtVal(prevCur?.value)}
          </div>}
        </div>

        <div style={s.card}>
          <div style={s.cardLabel}>Outlook DI (SA)</div>
          <div style={{ ...s.cardVal, color: diColor(latestOut?.value) }}>
            {watcher ? fmtVal(latestOut?.value) : SKELETON_H('36px')}
          </div>
          {watcher && <div style={s.cardSub}>
            M/M: <span style={{ color: diffColor(outDiff), fontWeight: '600' }}>{fmtDiff(outDiff)}</span>
            &ensp;prev: {fmtVal(prevOut?.value)}
          </div>}
        </div>

        <div style={s.card}>
          <div style={s.cardLabel}>Outlook − Current Spread</div>
          <div style={{ ...s.cardVal, color: diffColor(latestSpread) }}>
            {watcher ? fmtSpread(latestSpread) : SKELETON_H('36px')}
          </div>
          {watcher && <div style={s.cardSub}>
            prev: {fmtSpread(prevSpread)}
            &ensp;chg: <span style={{ color: diffColor(spreadDiff), fontWeight: '600' }}>{fmtDiff(spreadDiff)}</span>
          </div>}
        </div>
      </div>

      {/* ── Section 2: Long-term DI + Nikkei ── */}
      <div style={s.box}>
        <div style={s.boxTitle}>Economy Watchers DI (SA) vs. Nikkei 225 — 5-Year View</div>
        <div style={s.boxDesc}>
          Monthly survey of street-level observers (taxi drivers, retailers, restaurants, etc.) on current and 2–3 month ahead business conditions.
          DI above 50 = majority see improvement; below 50 = majority see deterioration. Higher frequency than Tankan (quarterly).
        </div>
        {wErr && !watcher
          ? <div style={{ color: '#aaa', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>Failed to load data</div>
          : !watcher
            ? SKELETON_H('320px')
            : <Line data={dualData} options={dualOpts} />
        }
        {nErr && <div style={{ ...s.note, color: '#E24B4A' }}>Nikkei data error: {nErr}</div>}
        <div style={s.insightBox}>
          📊 <b>Market insight:</b> The Nikkei 225 tends to lead Economy Watchers DI by roughly 3–6 months.
          When equities rally but DI fails to follow, it suggests the consumption and services sector is not yet benefiting.
          Conversely, a resilient DI during a market sell-off signals underlying economic strength.
        </div>
      </div>

      {/* ── Section 3: Spread (Outlook − Current) ── */}
      <div style={s.box}>
        <div style={s.boxTitle}>Outlook − Current DI Spread — Cycle Turn Signal</div>
        <div style={s.boxDesc}>
          Outlook DI minus Current DI. Positive = forward optimism (respondents expect improvement); negative = forward pessimism.
          Historically, the Current DI tends to follow the direction of this spread with a 1–3 month lag.
        </div>
        {wErr && !watcher
          ? <div style={{ color: '#aaa', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>Failed to load data</div>
          : !watcher
            ? SKELETON_H('200px')
            : <Bar data={spreadData} options={spreadOpts} />
        }
        <div style={s.insightBox}>
          📉 <b>Investment signal:</b> Two consecutive months of negative spread has historically preceded an economic slowdown.
          Current reading:&nbsp;
          <b style={{ color: diffColor(latestSpread) }}>
            {latestSpread != null
              ? latestSpread >= 0
                ? `+${latestSpread.toFixed(1)} pt (optimism dominant)`
                : `${latestSpread.toFixed(1)} pt (pessimism dominant)`
              : '--'}
          </b>
        </div>
      </div>

      {/* ── Section 4: Sector trends ── */}
      <div style={s.box}>
        <div style={s.boxTitle}>Current DI by Sector — Last 24 Months</div>
        <div style={s.boxDesc}>
          Breakdown into Household (retail, dining, travel), Corporate (orders, profitability), and Employment (hiring, job conditions).
          Wide divergence between sectors signals an uneven recovery.
        </div>
        {wErr && !watcher
          ? <div style={{ color: '#aaa', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>Failed to load data</div>
          : !watcher
            ? SKELETON_H('240px')
            : !hasSectors
              ? <div style={{ color: '#aaa', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>
                  Sector breakdown unavailable — showing aggregate only
                </div>
              : <Line data={sectorData} options={sectorOpts} />
        }
        <div style={s.note}>
          Household: supermarkets, convenience stores, dining, travel agencies.
          Corporate: manufacturing / non-manufacturing orders and margins.
          Employment: staffing agencies and public employment offices.
        </div>
      </div>

      {/* ── Section 5: Trend table ── */}
      <div style={s.box}>
        <div style={s.boxTitle}>Last 12 Months — Trend Table</div>
        {wErr && !watcher
          ? <div style={{ color: '#aaa', padding: '20px 0', textAlign: 'center', fontSize: '13px' }}>Failed to load data</div>
          : !watcher
            ? SKELETON_H('240px')
            : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Month</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Current DI</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Outlook DI</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Spread</th>
                <th style={{ ...s.th, textAlign: 'right' }}>M/M (Current)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={row.date} style={{ background: i === 0 ? '#FAFFF8' : 'transparent' }}>
                  <td style={s.td}>{row.date}</td>
                  <td style={{ ...s.tdNum, color: diColor(row.cur), fontWeight: i === 0 ? '600' : '400' }}>
                    {fmtVal(row.cur)}
                  </td>
                  <td style={{ ...s.tdNum, color: diColor(row.out) }}>
                    {fmtVal(row.out)}
                  </td>
                  <td style={{ ...s.tdNum, color: diffColor(row.spread) }}>
                    {fmtSpread(row.spread)}
                  </td>
                  <td style={{ ...s.tdNum, color: diffColor(row.diff) }}>
                    {row.diff == null ? '--' : fmtDiff(row.diff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={s.note}>
          Seasonally adjusted values from e-Stat. May differ from Cabinet Office official release by ±1–2 pts due to SA factor update timing.
        </div>
      </div>
    </main>
  )
}
