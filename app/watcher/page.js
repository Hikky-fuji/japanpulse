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
  grid2:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' },
  card:      { background: '#f8f8f6', borderRadius: '10px', padding: '14px 16px' },
  cardLabel: { fontSize: '10px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardVal:   { fontSize: '28px', fontWeight: '600' },
  cardSub:   { fontSize: '11px', color: '#888', marginTop: '3px' },
  box:       { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  boxTitle:  { fontSize: '13px', fontWeight: '500', marginBottom: '12px', color: '#333' },
  note:      { fontSize: '11px', color: '#aaa', marginTop: '8px' },
  badge:     { display: 'inline-block', fontSize: '10px', background: '#DCFCE7', color: '#166534', borderRadius: '4px', padding: '2px 7px', marginLeft: '8px', fontWeight: '600' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th:        { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #eee', color: '#555', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase' },
  td:        { padding: '8px 10px', borderBottom: '1px solid #f0f0f0' },
  tdNum:     { padding: '8px 10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
}

const diColor = (v) => v == null ? '#888' : v >= 50 ? '#1D9E75' : '#E24B4A'
const diffColor = (v) => v == null ? '#888' : v > 0 ? '#1D9E75' : v < 0 ? '#E24B4A' : '#888'
const fmtDiff = (v) => v == null ? '--' : v > 0 ? `▲${v.toFixed(1)}` : v < 0 ? `▼${Math.abs(v).toFixed(1)}` : '±0.0'
const fmtVal = (v) => v?.toFixed(1) ?? '--'

export default function Watcher() {
  const [watcher, setWatcher] = useState(null)
  const [nikkei, setNikkei] = useState(null)
  const [watcherErr, setWatcherErr] = useState(null)
  const [nikkeiErr, setNikkeiErr] = useState(null)

  useEffect(() => {
    fetch('/api/watcher')
      .then(r => r.json())
      .then(d => { if (d.error) setWatcherErr(d.error); else setWatcher(d) })
      .catch(e => setWatcherErr(e.message))

    fetch('/api/nikkei')
      .then(r => r.json())
      .then(d => { if (d.error) setNikkeiErr(d.error); else setNikkei(d) })
      .catch(e => setNikkeiErr(e.message))
  }, [])

  // ── Derived values ───────────────────────────────────────────────────────
  const cur = watcher?.current_all ?? []
  const out = watcher?.outlook_all ?? []
  const latestCur  = cur.at(-1)
  const prevCur    = cur.at(-2)
  const latestOut  = out.at(-1)
  const prevOut    = out.at(-2)
  const curDiff    = latestCur && prevCur ? parseFloat((latestCur.value - prevCur.value).toFixed(1)) : null
  const outDiff    = latestOut && prevOut ? parseFloat((latestOut.value - prevOut.value).toFixed(1)) : null

  // ── Dual Y-axis chart (DI + Nikkei) ──────────────────────────────────────
  const dualLabels = cur.map(v => v.date)
  const nikkeiMap  = Object.fromEntries((nikkei?.series ?? []).map(v => [v.date, v.value]))

  const dualData = {
    labels: dualLabels,
    datasets: [
      {
        label: '現状判断DI（全国）',
        data: cur.map(v => v.value),
        borderColor: '#378ADD',
        backgroundColor: 'rgba(55,138,221,0.08)',
        borderWidth: 2.5,
        pointRadius: 3,
        tension: 0.2,
        yAxisID: 'y',
      },
      {
        label: '先行き判断DI（全国）',
        data: dualLabels.map(d => out.find(v => v.date === d)?.value ?? null),
        borderColor: '#9B59B6',
        borderWidth: 2,
        pointRadius: 3,
        borderDash: [5, 4],
        tension: 0.2,
        spanGaps: false,
        yAxisID: 'y',
      },
      {
        label: 'DI = 50',
        data: dualLabels.map(() => 50),
        borderColor: '#ccc',
        borderWidth: 1,
        borderDash: [3, 3],
        pointRadius: 0,
        yAxisID: 'y',
      },
      ...(nikkeiErr ? [] : [{
        label: '日経平均 (右軸)',
        data: dualLabels.map(d => nikkeiMap[d] ?? null),
        borderColor: '#E67E22',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
        spanGaps: true,
        yAxisID: 'y2',
      }]),
    ],
  }

  const dualOpts = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      y: {
        type: 'linear',
        position: 'left',
        min: 30,
        max: 70,
        title: { display: true, text: 'DI', font: { size: 11 } },
        grid: { color: ctx => ctx.tick.value === 50 ? '#aaa' : '#f0f0f0' },
      },
      y2: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        title: { display: true, text: '日経平均 (¥)', font: { size: 11 } },
      },
    },
  }

  // ── Sector horizontal bar chart ───────────────────────────────────────────
  const hhLatest   = watcher?.current_hh?.at(-1)?.value ?? null
  const corpLatest = watcher?.current_corp?.at(-1)?.value ?? null
  const empLatest  = watcher?.current_emp?.at(-1)?.value ?? null
  const sectorValues = [hhLatest, corpLatest, empLatest]

  const sectorData = {
    labels: ['家計関連', '企業関連', '雇用関連'],
    datasets: [{
      label: '現状判断DI',
      data: sectorValues,
      backgroundColor: sectorValues.map(v =>
        v == null ? '#ddd' : v >= 50 ? 'rgba(29,158,117,0.75)' : 'rgba(226,75,74,0.75)'
      ),
      borderColor: sectorValues.map(v =>
        v == null ? '#bbb' : v >= 50 ? '#1D9E75' : '#E24B4A'
      ),
      borderWidth: 1,
    }],
  }

  const sectorOpts = {
    responsive: true,
    indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` DI: ${ctx.raw?.toFixed(1)}` } } },
    scales: {
      x: {
        min: 30,
        max: 70,
        grid: { color: ctx => ctx.tick.value === 50 ? '#aaa' : '#f0f0f0' },
        title: { display: true, text: 'DI (50 = 中立)' },
      },
    },
  }

  // ── Trend table (last 12 months) ──────────────────────────────────────────
  const tableRows = cur.slice(-12).reverse().map((v, i, arr) => {
    const prev = arr[i + 1]
    const outVal = out.find(o => o.date === v.date)?.value ?? null
    const diff = prev ? parseFloat((v.value - prev.value).toFixed(1)) : null
    return { date: v.date, cur: v.value, out: outVal, diff }
  })

  const latestDate = latestCur?.date ?? '...'

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
          Source: Cabinet Office (内閣府) · Latest: {latestDate}
        </span>
      </div>

      {/* Watcher API error */}
      {watcherErr && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#B91C1C' }}>
          景気ウォッチャーデータ取得エラー: {watcherErr}
        </div>
      )}

      {/* Section 1: KPI Cards */}
      {watcher && (
        <div style={s.grid2}>
          <div style={s.card}>
            <div style={s.cardLabel}>現状判断DI（全国・合計）</div>
            <div style={{ ...s.cardVal, color: diColor(latestCur?.value) }}>
              {fmtVal(latestCur?.value)}
            </div>
            <div style={s.cardSub}>
              前月比:&nbsp;
              <span style={{ color: diffColor(curDiff), fontWeight: '600' }}>{fmtDiff(curDiff)}</span>
              &nbsp;({prevCur?.date ?? '--'}: {fmtVal(prevCur?.value)})
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardLabel}>先行き判断DI（全国・合計）</div>
            <div style={{ ...s.cardVal, color: diColor(latestOut?.value) }}>
              {fmtVal(latestOut?.value)}
            </div>
            <div style={s.cardSub}>
              前月比:&nbsp;
              <span style={{ color: diffColor(outDiff), fontWeight: '600' }}>{fmtDiff(outDiff)}</span>
              &nbsp;({prevOut?.date ?? '--'}: {fmtVal(prevOut?.value)})
            </div>
          </div>
        </div>
      )}
      {!watcher && !watcherErr && (
        <div style={{ ...s.grid2, marginBottom: '20px' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ ...s.card, background: '#f0f0ee', minHeight: '80px' }} />
          ))}
        </div>
      )}

      {/* Section 2: Dual Y-axis chart */}
      <div style={s.box}>
        <div style={s.boxTitle}>Economy Watchers DI vs. Nikkei 225</div>
        {watcherErr && !watcher ? (
          <div style={{ color: '#aaa', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>データ取得失敗</div>
        ) : !watcher ? (
          <div style={{ background: '#f5f5f3', borderRadius: '8px', height: '300px' }} />
        ) : (
          <Line data={dualData} options={dualOpts} />
        )}
        {nikkeiErr && <div style={{ ...s.note, color: '#E24B4A' }}>日経平均取得エラー: {nikkeiErr}</div>}
        <div style={s.note}>
          ※ DI &gt; 50 = 景気改善判断が多数。破線 = 先行き判断DI。右軸 = 日経平均株価。
        </div>
      </div>

      {/* Section 3: Sector bar chart */}
      <div style={s.box}>
        <div style={s.boxTitle}>Current DI by Sector（最新月: {latestDate}）</div>
        {watcherErr && !watcher ? (
          <div style={{ color: '#aaa', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>データ取得失敗</div>
        ) : !watcher ? (
          <div style={{ background: '#f5f5f3', borderRadius: '8px', height: '160px' }} />
        ) : (
          <Bar data={sectorData} options={sectorOpts} />
        )}
        <div style={s.note}>※ 全国・現状判断DI。50超 = 緑（改善）、50未満 = 赤（悪化）。</div>
      </div>

      {/* Section 4: Trend table */}
      <div style={s.box}>
        <div style={s.boxTitle}>過去12ヶ月トレンド</div>
        {watcherErr && !watcher ? (
          <div style={{ color: '#aaa', padding: '20px 0', textAlign: 'center', fontSize: '13px' }}>データ取得失敗</div>
        ) : !watcher ? (
          <div style={{ background: '#f5f5f3', borderRadius: '8px', height: '200px' }} />
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>年月</th>
                <th style={{ ...s.th, textAlign: 'right' }}>現状判断DI</th>
                <th style={{ ...s.th, textAlign: 'right' }}>先行き判断DI</th>
                <th style={{ ...s.th, textAlign: 'right' }}>前月差（現状）</th>
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
                  <td style={{ ...s.tdNum, color: diffColor(row.diff) }}>
                    {row.diff == null ? '--' : fmtDiff(row.diff)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={s.note}>※ 全国・合計。最新月を上に表示。前月差は現状判断DIの変化。</div>
      </div>
    </main>
  )
}
