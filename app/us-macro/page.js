'use client'
import React, { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

export default function USMacroDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/us-macro')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(String(e)))
  }, [])

  if (error) return <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#E24B4A' }}>Error: {error}</div>
  if (!data)  return <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#666' }}>Loading US Macro data…</div>

  const { employment, sectors, wages, inflation, growth, policy } = data

  // ── helpers ──────────────────────────────────────────────────────────
  const lat = arr => arr?.length ? arr[arr.length - 1] : null
  const prv = arr => arr?.length > 1 ? arr[arr.length - 2] : null

  const yoyVal = arr => {
    if (!arr || arr.length < 13) return null
    return (arr[arr.length - 1].value / arr[arr.length - 13].value - 1) * 100
  }

  const yoySeries = arr => {
    if (!arr || arr.length < 13) return { labels: [], values: [] }
    const labels = [], values = []
    for (let i = 12; i < arr.length; i++) {
      labels.push(arr[i].date.slice(0, 7))
      values.push((arr[i].value / arr[i - 12].value - 1) * 100)
    }
    return { labels, values }
  }

  const momDiff = arr => {
    if (!arr || arr.length < 2) return null
    return arr[arr.length - 1].value - arr[arr.length - 2].value
  }

  const fmtPct  = (v, d = 2) => v != null ? v.toFixed(d) + '%' : '--'
  const fmtSign = (v, d = 2, sfx = 'pp') => v != null ? (v >= 0 ? '+' : '') + v.toFixed(d) + sfx : '--'
  const fmtK    = v => v != null ? (v >= 0 ? '+' : '') + Math.round(v) + 'K' : '--'
  const dc      = v => v == null ? '#888' : v >= 0 ? '#1D9E75' : '#E24B4A'

  // ── Fed Watch ────────────────────────────────────────────────────────
  const ff    = lat(policy.fedfunds)
  const ffPrv = prv(policy.fedfunds)
  const ffChg = ff && ffPrv ? ff.value - ffPrv.value : null

  // ── Inflation ────────────────────────────────────────────────────────
  const cpiYoY     = yoyVal(inflation.cpi)
  const coreCpiYoY = yoyVal(inflation.coreCpi)
  const cpiPrevYoY = inflation.cpi?.length >= 14
    ? (inflation.cpi[inflation.cpi.length - 2].value / inflation.cpi[inflation.cpi.length - 14].value - 1) * 100
    : null
  const corePrevYoY = inflation.coreCpi?.length >= 14
    ? (inflation.coreCpi[inflation.coreCpi.length - 2].value / inflation.coreCpi[inflation.coreCpi.length - 14].value - 1) * 100
    : null

  const cpiYS     = yoySeries(inflation.cpi)
  const coreCpiYS = yoySeries(inflation.coreCpi)
  const inflLen   = Math.min(cpiYS.labels.length, coreCpiYS.labels.length)
  const inflLabels = cpiYS.labels.slice(-inflLen)

  // ── Employment ───────────────────────────────────────────────────────
  const nfp     = employment.nfp
  const nfpChg  = momDiff(nfp)
  const nfpPrev = nfp?.length >= 3 ? nfp[nfp.length - 2].value - nfp[nfp.length - 3].value : null

  const unrLat = lat(employment.unrate)
  const unrPrv = prv(employment.unrate)
  const u6Lat  = lat(employment.u6rate)
  const u6Prv  = prv(employment.u6rate)

  const aheYoY     = yoyVal(employment.ahe)
  const ahePrevYoY = employment.ahe?.length >= 14
    ? (employment.ahe[employment.ahe.length - 2].value / employment.ahe[employment.ahe.length - 14].value - 1) * 100
    : null

  // NFP 12M bar
  const nfp13     = nfp?.length >= 13 ? nfp.slice(-13) : []
  const nfp12Lbls = nfp13.slice(1).map(v => v.date.slice(0, 7))
  const nfp12Vals = nfp13.slice(1).map((v, i) => v.value - nfp13[i].value)

  // U3 / U6 24M
  const unr24     = employment.unrate?.slice(-24) || []
  const u6_24     = employment.u6rate?.slice(-24) || []
  const unrLabels = unr24.map(v => v.date.slice(0, 7))

  // Participation 24M
  const civpart24   = employment.civpart?.slice(-24) || []
  const prime24     = employment.prime_part?.slice(-24) || []
  const partLabels  = civpart24.map(v => v.date.slice(0, 7))

  // ── Sectors ──────────────────────────────────────────────────────────
  const sectorDefs = [
    { key: 'goods',        label: 'Goods-Producing' },
    { key: 'construction', label: 'Construction' },
    { key: 'trade',        label: 'Retail Trade' },
    { key: 'info',         label: 'Information' },
    { key: 'fire',         label: 'Financial' },
    { key: 'pbs',          label: 'Prof. & Bus. Svcs' },
    { key: 'ehs',          label: 'Edu & Health' },
    { key: 'lah',          label: 'Leisure & Hosp.' },
    { key: 'govt',         label: 'Government' },
  ]
  const sectorChanges = sectorDefs.map(d => momDiff(sectors[d.key]) ?? 0)
  const sectorLabels  = sectorDefs.map(d => d.label)

  const wageDefs = [
    { key: 'goods_prod',   label: 'Goods Prod.' },
    { key: 'private_srv',  label: 'Private Svcs' },
    { key: 'construction', label: 'Construction' },
    { key: 'retail',       label: 'Retail' },
    { key: 'info',         label: 'Information' },
    { key: 'finance',      label: 'Financial' },
    { key: 'professional', label: 'Prof. Services' },
    { key: 'edu_health',   label: 'Edu & Health' },
    { key: 'leisure',      label: 'Leisure & Hosp.' },
  ]
  const wageYoYs  = wageDefs.map(d => yoyVal(wages.bySector[d.key]) ?? 0)
  const wageLabels = wageDefs.map(d => d.label)

  // ── Growth ───────────────────────────────────────────────────────────
  const gdpArr    = growth.gdp
  const gdpQoQ    = gdpArr?.length >= 2
    ? ((gdpArr[gdpArr.length - 1].value / gdpArr[gdpArr.length - 2].value) ** 4 - 1) * 100
    : null
  const gdpPrevQoQ = gdpArr?.length >= 3
    ? ((gdpArr[gdpArr.length - 2].value / gdpArr[gdpArr.length - 3].value) ** 4 - 1) * 100
    : null

  const retYoY = yoyVal(growth.retail)
  const retYS  = yoySeries(growth.retail)

  // ── Styles ───────────────────────────────────────────────────────────
  const s = {
    wrap:      { maxWidth: '980px', margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
    header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '14px' },
    sec:       { fontSize: '11px', fontWeight: '700', color: '#378ADD', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 0 6px', marginTop: '24px', borderBottom: '2px solid #ddeeff', marginBottom: '14px' },
    grid4:     { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' },
    grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' },
    grid2sm:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' },
    card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
    cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    cardVal:   { fontSize: '22px', fontWeight: '600', color: '#111' },
    cardSub:   { fontSize: '11px', marginTop: '3px' },
    box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#333' },
    boxSub:    { fontSize: '10px', color: '#aaa', marginBottom: '10px' },
  }

  const lineOpts = {
    responsive: true,
    plugins: {
      legend:  { position: 'top' },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: { y: { ticks: { callback: v => v.toFixed(1) + '%' } } },
  }

  const nfpBarOpts = {
    responsive: true,
    plugins: {
      legend:  { display: false },
      tooltip: {
        mode: 'index', intersect: false,
        callbacks: { label: ctx => (ctx.parsed.y >= 0 ? '+' : '') + Math.round(ctx.parsed.y) + 'K' },
      },
    },
    scales: { y: { ticks: { callback: v => (v >= 0 ? '+' : '') + Math.round(v) + 'K' } } },
  }

  const hbarEmpOpts = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend:  { display: false },
      tooltip: { callbacks: { label: ctx => (ctx.parsed.x >= 0 ? '+' : '') + Math.round(ctx.parsed.x) + 'K' } },
    },
    scales: { x: { ticks: { callback: v => (v >= 0 ? '+' : '') + Math.round(v) + 'K' } } },
  }

  const hbarWageOpts = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend:  { display: false },
      tooltip: { callbacks: { label: ctx => ctx.parsed.x.toFixed(2) + '%' } },
    },
    scales: { x: { ticks: { callback: v => v.toFixed(1) + '%' } } },
  }

  return (
    <main style={s.wrap}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#111', margin: 0 }}>
            🇺🇸 US Macro — Personal View
          </h1>
          <div style={{ fontSize: '11px', color: '#aaa', marginTop: '3px' }}>
            JapanPulse sub-page · Source: FRED (St. Louis Fed)
          </div>
        </div>
        <a href="/" style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>← Home</a>
      </div>

      {/* ── Section 1: Fed Watch ── */}
      <div style={s.sec}>Fed Watch</div>
      <div style={s.grid2sm}>
        <div style={s.card}>
          <div style={s.cardLabel}>Fed Funds Rate — Effective (FEDFUNDS)</div>
          <div style={s.cardVal}>{ff ? ff.value.toFixed(2) + '%' : '--'}</div>
          <div style={{ ...s.cardSub, color: '#888' }}>
            {fmtSign(ffChg, 2, 'pp')} vs prior month
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Next FOMC (Scheduled)</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#378ADD', marginTop: '4px' }}>
            2026-06-18
          </div>
          <div style={{ ...s.cardSub, color: '#888' }}>Hardcoded · Check Fed calendar for updates</div>
        </div>
      </div>

      {/* ── Section 2: Inflation ── */}
      <div style={s.sec}>Inflation (CPI)</div>
      <div style={s.grid2sm}>
        <div style={s.card}>
          <div style={s.cardLabel}>CPI YoY — All Items, SA (CPIAUCSL)</div>
          <div style={s.cardVal}>{fmtPct(cpiYoY)}</div>
          <div style={{ ...s.cardSub, color: cpiYoY != null && cpiPrevYoY != null ? dc(cpiPrevYoY - cpiYoY) : '#888' }}>
            {cpiYoY != null && cpiPrevYoY != null
              ? fmtSign(cpiYoY - cpiPrevYoY, 2) + ' vs prior month'
              : ''}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Core CPI YoY — ex. Food &amp; Energy, SA (CPILFESL)</div>
          <div style={s.cardVal}>{fmtPct(coreCpiYoY)}</div>
          <div style={{ ...s.cardSub, color: coreCpiYoY != null && corePrevYoY != null ? dc(corePrevYoY - coreCpiYoY) : '#888' }}>
            {coreCpiYoY != null && corePrevYoY != null
              ? fmtSign(coreCpiYoY - corePrevYoY, 2) + ' vs prior month'
              : ''}
          </div>
        </div>
      </div>
      <div style={s.box}>
        <div style={s.boxTitle}>CPI vs Core CPI — Year-over-Year % (24M)</div>
        <div style={s.boxSub}>SA · CPIAUCSL / CPILFESL (FRED) · YoY calculated client-side</div>
        <Line
          data={{
            labels: inflLabels,
            datasets: [
              { label: 'CPI (All Items)',  data: cpiYS.values.slice(-inflLen),     borderColor: '#378ADD', borderWidth: 2, pointRadius: 0, tension: 0.3 },
              { label: 'Core CPI',         data: coreCpiYS.values.slice(-inflLen), borderColor: '#D85A30', borderWidth: 2, pointRadius: 0, tension: 0.3 },
            ],
          }}
          options={lineOpts}
        />
      </div>

      {/* ── Section 3: Employment (Main) ── */}
      <div style={s.sec}>Employment (Main)</div>
      <div style={s.grid4}>
        {[
          {
            label: 'NFP M/M Change, SA (PAYEMS)',
            val:   nfpChg != null ? fmtK(nfpChg) : '--',
            sub:   nfpPrev != null ? 'Prior: ' + fmtK(nfpPrev) : '',
            color: dc(nfpChg),
          },
          {
            label: 'Unemployment Rate U-3, SA (UNRATE)',
            val:   unrLat ? unrLat.value.toFixed(1) + '%' : '--',
            sub:   unrLat && unrPrv ? fmtSign(unrLat.value - unrPrv.value, 1) + ' vs prior' : '',
            color: dc(unrLat && unrPrv ? unrPrv.value - unrLat.value : null),
          },
          {
            label: 'Broad Unemployment U-6, SA (U6RATE)',
            val:   u6Lat ? u6Lat.value.toFixed(1) + '%' : '--',
            sub:   u6Lat && u6Prv ? fmtSign(u6Lat.value - u6Prv.value, 1) + ' vs prior' : '',
            color: dc(u6Lat && u6Prv ? u6Prv.value - u6Lat.value : null),
          },
          {
            label: 'AHE YoY — All Private, SA (CES05)',
            val:   fmtPct(aheYoY),
            sub:   ahePrevYoY != null ? 'Prior: ' + fmtPct(ahePrevYoY) : '',
            color: dc(aheYoY),
          },
        ].map(k => (
          <div key={k.label} style={s.card}>
            <div style={s.cardLabel}>{k.label}</div>
            <div style={s.cardVal}>{k.val}</div>
            <div style={{ ...s.cardSub, color: k.color }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* NFP 12M bar */}
      <div style={s.box}>
        <div style={s.boxTitle}>NFP Monthly Change — Last 12 Months (Thousands, SA)</div>
        <div style={s.boxSub}>SA · PAYEMS M/M level difference (FRED) · Blue = positive, Red = negative</div>
        <Bar
          data={{
            labels: nfp12Lbls,
            datasets: [{
              label: 'NFP Change (K)',
              data:  nfp12Vals,
              backgroundColor: nfp12Vals.map(v => v >= 0 ? 'rgba(55,138,221,0.75)' : 'rgba(226,75,74,0.75)'),
            }],
          }}
          options={nfpBarOpts}
        />
      </div>

      <div style={s.grid2}>
        {/* U3 vs U6 */}
        <div style={s.box}>
          <div style={s.boxTitle}>Unemployment Rate U-3 vs U-6 (24M)</div>
          <div style={s.boxSub}>SA · UNRATE / U6RATE (FRED)</div>
          <Line
            data={{
              labels: unrLabels,
              datasets: [
                { label: 'U-3 (Headline)', data: unr24.map(v => v.value), borderColor: '#378ADD', borderWidth: 2, pointRadius: 0, tension: 0.3 },
                { label: 'U-6 (Broad)',    data: u6_24.map(v => v.value), borderColor: '#D85A30', borderWidth: 2, pointRadius: 0, tension: 0.3 },
              ],
            }}
            options={lineOpts}
          />
        </div>

        {/* Participation rate */}
        <div style={s.box}>
          <div style={s.boxTitle}>Labor Force Participation Rate (24M)</div>
          <div style={s.boxSub}>SA · CIVPART / LNS11300060 (FRED)</div>
          <Line
            data={{
              labels: partLabels,
              datasets: [
                { label: 'Overall (16+)',   data: civpart24.map(v => v.value), borderColor: '#1D9E75', borderWidth: 2, pointRadius: 0, tension: 0.3 },
                { label: 'Prime Age 25-54', data: prime24.map(v => v.value),   borderColor: '#9B59B6', borderWidth: 2, pointRadius: 0, tension: 0.3 },
              ],
            }}
            options={lineOpts}
          />
        </div>
      </div>

      {/* ── Section 4: Sector Employment ── */}
      <div style={s.sec}>Sector Employment — Latest Month</div>
      <div style={s.grid2}>
        <div style={s.box}>
          <div style={s.boxTitle}>Sector Employment Change M/M (Thousands, SA)</div>
          <div style={s.boxSub}>SA · USGOOD / USCONS etc. (FRED) · Blue = hiring, Red = cuts</div>
          <Bar
            data={{
              labels: sectorLabels,
              datasets: [{
                data: sectorChanges,
                backgroundColor: sectorChanges.map(v => v >= 0 ? 'rgba(55,138,221,0.75)' : 'rgba(226,75,74,0.75)'),
              }],
            }}
            options={hbarEmpOpts}
          />
        </div>

        <div style={s.box}>
          <div style={s.boxTitle}>Sector Average Hourly Earnings YoY (%)</div>
          <div style={s.boxSub}>SA · CES series (FRED) · YoY calculated client-side</div>
          <Bar
            data={{
              labels: wageLabels,
              datasets: [{
                data: wageYoYs,
                backgroundColor: wageYoYs.map(v => v >= 0 ? 'rgba(29,158,117,0.75)' : 'rgba(226,75,74,0.75)'),
              }],
            }}
            options={hbarWageOpts}
          />
        </div>
      </div>

      {/* ── Section 5: Growth & Consumption ── */}
      <div style={s.sec}>Growth &amp; Consumption</div>
      <div style={s.grid2sm}>
        <div style={s.card}>
          <div style={s.cardLabel}>GDP Q/Q SAAR — Nominal (GDP)</div>
          <div style={s.cardVal}>{fmtPct(gdpQoQ)}</div>
          <div style={{ ...s.cardSub, color: dc(gdpQoQ) }}>
            {gdpPrevQoQ != null ? 'Prior Q: ' + fmtPct(gdpPrevQoQ) : ''}
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Retail Sales YoY, SA (RSAFS)</div>
          <div style={s.cardVal}>{fmtPct(retYoY)}</div>
          <div style={{ ...s.cardSub, color: dc(retYoY) }}>YoY calculated client-side</div>
        </div>
      </div>
      <div style={s.box}>
        <div style={s.boxTitle}>Retail Sales — Year-over-Year % (24M)</div>
        <div style={s.boxSub}>SA · RSAFS (FRED) · Advance Retail Sales: Retail Trade</div>
        <Line
          data={{
            labels: retYS.labels,
            datasets: [{
              label: 'Retail Sales YoY',
              data:  retYS.values,
              borderColor: '#1D9E75',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.3,
            }],
          }}
          options={lineOpts}
        />
      </div>

      {/* ── Footer ── */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #eee', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
        Data: FRED (Federal Reserve Bank of St. Louis) · Personal use only
      </div>
    </main>
  )
}
