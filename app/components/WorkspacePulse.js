'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const last = series => Array.isArray(series) && series.length ? series.at(-1) : null
const finite = value => Number.isFinite(value)

function signed(value, digits = 1, suffix = '') {
  if (!finite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${suffix}`
}

function fixed(value, digits = 1, suffix = '') {
  return finite(value) ? `${value.toFixed(digits)}${suffix}` : '—'
}

function tone(value, inverse = false) {
  if (!finite(value) || value === 0) return 'neutral'
  const positive = inverse ? value < 0 : value > 0
  return positive ? 'positive' : 'negative'
}

function yearAgoValue(observations, current) {
  if (!current?.date) return null
  const targetYear = String(Number(current.date.slice(0, 4)) - 1)
  const target = `${targetYear}${current.date.slice(4)}`
  return observations.find(item => item.date === target && finite(item.value))?.value ?? null
}

function yoyFromIndex(observations) {
  const clean = (observations || []).filter(item => finite(item.value))
  const current = last(clean)
  const prior = yearAgoValue(clean, current)
  return {
    date: current?.date?.slice(0, 7),
    value: current && finite(prior) ? (current.value / prior - 1) * 100 : null,
  }
}

function pctChange(current, prior) {
  return finite(current) && finite(prior) && prior !== 0 ? (current / prior - 1) * 100 : null
}

function quarterLabel(date) {
  if (!date) return null
  const month = Number(date.slice(5, 7))
  return `${date.slice(0, 4)}-Q${Math.ceil(month / 3)}`
}

function detail(label, value, toneName = 'neutral') {
  return { label, value, tone: toneName }
}

function card({ label, href, mainLabel, value, period, toneName = 'neutral', details, source }) {
  return { label, href, mainLabel, value, period, tone: toneName, details, source }
}

function japanCards(payload) {
  const { cpi, gdp, iip, consumption, watcher, labour, jobRatio, wages, trade } = payload
  const headline = last(cpi?.headline)
  const core = last(cpi?.core)
  const corecore = last(cpi?.corecore)
  const gdpLatest = last(gdp?.gdp_qoq)
  const iipLatest = last(iip?.['鉱工業'])
  const consLatest = last(consumption?.total)
  const basicLatest = last(consumption?.basic)
  const discLatest = last(consumption?.discretionary)
  const watcherCurrent = last(watcher?.current_all)
  const watcherOutlook = last(watcher?.outlook_all)
  const labourLatest = last(labour?.data)
  const ratio = jobRatio?.latest
  const realWage = last(wages?.real)
  const nominalWage = last(wages?.nominal)
  const scheduledWage = last(wages?.scheduled)
  const exp = last(trade?.export?.total)
  const imp = last(trade?.import?.total)
  const expPrior = trade?.export?.total?.at(-13)
  const balance = finite(exp?.value) && finite(imp?.value) ? exp.value - imp.value : null
  const toTrillion = value => finite(value) ? `${value >= 0 ? '+' : ''}¥${(value / 1e9).toFixed(1)}T` : '—'

  return [
    card({
      label: 'Prices',
      href: '/cpi',
      mainLabel: 'Headline CPI',
      value: fixed(headline?.value, 1, '%'),
      period: headline?.date,
      toneName: tone(headline?.value - 2, true),
      details: [
        detail('Core', fixed(core?.value, 1, '%')),
        detail('Core-core', fixed(corecore?.value, 1, '%')),
      ],
      source: 'MIC · e-Stat',
    }),
    card({
      label: 'Growth & Production',
      href: '/gdp',
      mainLabel: 'Real GDP QoQ',
      value: signed(gdpLatest?.value, 1, '%'),
      period: gdpLatest?.date,
      toneName: tone(gdpLatest?.value),
      details: [
        detail('IIP MoM', signed(iipLatest?.prod_mom, 1, '%'), tone(iipLatest?.prod_mom)),
        detail('IIP YoY', signed(iipLatest?.prod_yoy, 1, '%'), tone(iipLatest?.prod_yoy)),
      ],
      source: 'Cabinet Office · METI',
    }),
    card({
      label: 'Private Consumption',
      href: '/consumption',
      mainLabel: 'Real spending YoY',
      value: signed(consLatest?.value, 1, '%'),
      period: consLatest?.date,
      toneName: tone(consLatest?.value),
      details: [
        detail('Basic', signed(basicLatest?.value, 1, '%'), tone(basicLatest?.value)),
        detail('Discretionary', signed(discLatest?.value, 1, '%'), tone(discLatest?.value)),
      ],
      source: 'MIC · Family Survey',
    }),
    card({
      label: 'Surveys & Sentiment',
      href: '/watcher',
      mainLabel: 'Economy Watchers',
      value: fixed(watcherCurrent?.value, 1),
      period: watcherCurrent?.date,
      toneName: tone(watcherCurrent?.value - 50),
      details: [
        detail('Outlook DI', fixed(watcherOutlook?.value, 1), tone(watcherOutlook?.value - 50)),
        detail('Neutral line', '50.0'),
      ],
      source: 'Cabinet Office',
    }),
    card({
      label: 'Employment',
      href: '/labour',
      mainLabel: 'Unemployment',
      value: fixed(labourLatest?.unemploymentRate, 1, '%'),
      period: labourLatest?.date,
      toneName: tone(labourLatest?.unemploymentRate - 3, true),
      details: [
        detail('Jobs / applicant', fixed(ratio?.ratio, 2, 'x'), tone(ratio?.ratio - 1)),
        detail('Employment YoY', signed(labourLatest?.employedYoY, 1, '%'), tone(labourLatest?.employedYoY)),
      ],
      source: 'MIC · MHLW',
    }),
    card({
      label: 'Wages',
      href: '/wages',
      mainLabel: 'Real wages YoY',
      value: signed(realWage?.yoy, 1, '%'),
      period: realWage?.date,
      toneName: tone(realWage?.yoy),
      details: [
        detail('Nominal wages', signed(nominalWage?.yoy, 1, '%'), tone(nominalWage?.yoy)),
        detail('Scheduled pay', signed(scheduledWage?.yoy, 1, '%'), tone(scheduledWage?.yoy)),
      ],
      source: 'MHLW',
    }),
    card({
      label: 'External Sector',
      href: '/trade',
      mainLabel: 'Trade balance',
      value: toTrillion(balance),
      period: exp?.date,
      toneName: tone(balance),
      details: [
        detail('Exports YoY', signed(pctChange(exp?.value, expPrior?.value), 1, '%'), tone(pctChange(exp?.value, expPrior?.value))),
        detail('Imports', finite(imp?.value) ? `¥${(imp.value / 1e9).toFixed(1)}T` : '—'),
      ],
      source: 'MOF · e-Stat',
    }),
  ]
}

function usCards(payload) {
  const { cpi, employment, consumption, jolts, manufacturing, macro } = payload
  const headlineCpi = yoyFromIndex(cpi?.series?.headline?.observations)
  const coreCpi = yoyFromIndex(cpi?.series?.core?.observations)
  const corePce = yoyFromIndex(consumption?.series?.corePce?.observations)
  const realPce = consumption?.series?.realPce?.observations?.filter(item => finite(item.value)) || []
  const realDpi = consumption?.series?.realDisposableIncome?.observations?.filter(item => finite(item.value)) || []
  const saving = last(consumption?.series?.savingRate?.observations?.filter(item => finite(item.value)))
  const realPceLatest = last(realPce)
  const realDpiLatest = last(realDpi)
  const realGdp = last(macro?.growth?.realGdpGrowth)
  const retail = macro?.growth?.retail || []
  const retailLatest = last(retail)
  const retailYearAgo = yearAgoValue(retail, retailLatest)
  const empire = last(manufacturing?.regional?.empire?.series?.headline?.observations?.filter(item => finite(item.value)))
  const philly = last(manufacturing?.regional?.philly?.series?.headline?.observations?.filter(item => finite(item.value)))
  const ism = last(manufacturing?.ism?.headline)
  const payrolls = employment?.employment?.payems || []
  const payrollLatest = last(payrolls)
  const payrollPrior = payrolls.at(-2)
  const unemployment = last(employment?.employment?.unrate)
  const openingsRate = last(jolts?.series?.openingsRate?.observations?.filter(item => finite(item.value)))
  const quitsRate = last(jolts?.series?.quitsRate?.observations?.filter(item => finite(item.value)))
  const fedFunds = last(macro?.policy?.fedfunds)

  return [
    card({
      label: 'Prices',
      href: '/us/cpi',
      mainLabel: 'Headline CPI YoY',
      value: fixed(headlineCpi.value, 1, '%'),
      period: headlineCpi.date,
      toneName: tone(headlineCpi.value - 2, true),
      details: [
        detail('Core CPI', fixed(coreCpi.value, 1, '%')),
        detail('Core PCE', fixed(corePce.value, 1, '%')),
      ],
      source: 'BLS · BEA · FRED',
    }),
    card({
      label: 'Economic Growth',
      href: '/us-macro#growth',
      mainLabel: 'Real GDP QoQ SAAR',
      value: signed(realGdp?.value, 1, '%'),
      period: quarterLabel(realGdp?.date),
      toneName: tone(realGdp?.value),
      details: [
        detail('Retail sales YoY', signed(pctChange(retailLatest?.value, retailYearAgo), 1, '%'), tone(pctChange(retailLatest?.value, retailYearAgo))),
        detail('Real PCE YoY', signed(pctChange(realPceLatest?.value, realPce.at(-13)?.value), 1, '%'), tone(pctChange(realPceLatest?.value, realPce.at(-13)?.value))),
      ],
      source: 'BEA · Census · FRED',
    }),
    card({
      label: 'Private Consumption',
      href: '/us/consumption',
      mainLabel: 'Real PCE MoM',
      value: signed(pctChange(realPceLatest?.value, realPce.at(-2)?.value), 2, '%'),
      period: realPceLatest?.date?.slice(0, 7),
      toneName: tone(pctChange(realPceLatest?.value, realPce.at(-2)?.value)),
      details: [
        detail('Real DPI MoM', signed(pctChange(realDpiLatest?.value, realDpi.at(-2)?.value), 2, '%'), tone(pctChange(realDpiLatest?.value, realDpi.at(-2)?.value))),
        detail('Saving rate', fixed(saving?.value, 1, '%')),
      ],
      source: 'BEA · FRED',
    }),
    card({
      label: 'Surveys & Sentiment',
      href: '/us/manufacturing',
      mainLabel: 'ISM Manufacturing',
      value: fixed(ism?.value, 1),
      period: ism?.date?.slice(0, 7),
      toneName: tone(ism?.value - 50),
      details: [
        detail('NY Empire', signed(empire?.value, 1), tone(empire?.value)),
        detail('Philly Fed', signed(philly?.value, 1), tone(philly?.value)),
      ],
      source: 'NY Fed · Philly Fed · ISM',
    }),
    card({
      label: 'Employment & Wages',
      href: '/us/employment',
      mainLabel: 'Nonfarm payrolls',
      value: signed(payrollLatest?.value - payrollPrior?.value, 0, 'K'),
      period: payrollLatest?.date?.slice(0, 7),
      toneName: tone(payrollLatest?.value - payrollPrior?.value),
      details: [
        detail('Unemployment', fixed(unemployment?.value, 1, '%'), tone(unemployment?.value - 4.5, true)),
        detail('Openings rate', fixed(openingsRate?.value, 1, '%'), tone(openingsRate?.value - 4)),
      ],
      source: 'BLS · FRED',
    }),
    card({
      label: 'Policy & Labor Flows',
      href: '/us-macro#fed-policy',
      mainLabel: 'Effective fed funds',
      value: fixed(fedFunds?.value, 2, '%'),
      period: fedFunds?.date?.slice(0, 7),
      toneName: 'neutral',
      details: [
        detail('Core PCE vs 2%', signed(corePce.value - 2, 1, 'pp'), tone(corePce.value - 2, true)),
        detail('Quits rate', fixed(quitsRate?.value, 1, '%')),
      ],
      source: 'Federal Reserve · BLS',
    }),
  ]
}

async function fetchJson(path, signal) {
  try {
    const response = await fetch(path, { signal })
    if (!response.ok) return null
    const payload = await response.json()
    return payload?.error ? null : payload
  } catch (error) {
    if (error.name === 'AbortError') throw error
    return null
  }
}

export default function WorkspacePulse({ countryCode }) {
  const [cards, setCards] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const config = countryCode === 'JP'
      ? {
          paths: {
            cpi: '/api/cpi',
            gdp: '/api/gdp',
            iip: '/api/iip',
            consumption: '/api/consumption',
            watcher: '/api/watcher',
            labour: '/api/labour',
            jobRatio: '/api/job-ratio',
            wages: '/api/wages',
            trade: '/api/trade',
          },
          build: japanCards,
        }
      : {
          paths: {
            cpi: '/api/us-cpi',
            employment: '/api/us-employment',
            consumption: '/api/us-consumption',
            jolts: '/api/us-jolts',
            manufacturing: '/api/us-manufacturing',
            macro: '/api/us-macro',
          },
          build: usCards,
        }

    Promise.all(
      Object.entries(config.paths).map(async ([key, path]) => [key, await fetchJson(path, controller.signal)]),
    )
      .then(entries => setCards(config.build(Object.fromEntries(entries))))
      .catch(error => {
        if (error.name !== 'AbortError') setCards([])
      })

    return () => controller.abort()
  }, [countryCode])

  if (Array.isArray(cards) && cards.length === 0) return null
  const placeholders = Array.from({ length: countryCode === 'JP' ? 7 : 6 })

  return (
    <section className="workspace-pulse" aria-label={`${countryCode} macro at a glance`}>
      <header className="workspace-pulse__header">
        <div>
          <span>Macro at a glance</span>
          <strong>Cross-indicator current pulse</strong>
        </div>
        <small>{cards ? 'Official data · cached · auto-updated' : 'Connecting to official sources…'}</small>
      </header>
      <div className="workspace-pulse__grid">
        {(cards || placeholders).map((item, index) => item ? (
          <Link className={`workspace-pulse__item is-${item.tone}`} href={item.href} key={item.label}>
            <div className="workspace-pulse__topline">
              <span>{item.label}</span>
              <b>Open →</b>
            </div>
            <div className="workspace-pulse__main-label">{item.mainLabel}</div>
            <strong>{item.value}</strong>
            <time>{item.period || 'Latest available'}</time>
            <div className="workspace-pulse__details">
              {item.details.map(row => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <b className={`is-${row.tone}`}>{row.value}</b>
                </div>
              ))}
            </div>
            <footer>{item.source}</footer>
          </Link>
        ) : (
          <div className="workspace-pulse__item is-loading" key={index}>
            <div className="workspace-pulse__topline"><span>Loading category</span></div>
            <strong>—</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
