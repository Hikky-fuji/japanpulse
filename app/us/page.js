import MacroWorkspace from '../components/MacroWorkspace'

const indicators = [
  {
    group: 'Prices',
    color: '#E67E22',
    bg: '#FFF8F0',
    border: '#F0A050',
    items: [
      {
        href: '/us/cpi',
        title: 'CPI & Inflation',
        subtitle: 'Headline / Core / Services ex Shelter',
        badge: 'Monthly',
        desc: 'Headline, core, supercore proxy, category momentum and inflation contributions. Source: BLS via FRED.',
      },
    ],
  },
  {
    group: 'Economic Growth',
    color: '#27AE60',
    bg: '#F0FAF4',
    border: '#5DBF80',
    items: [
      {
        href: '/us-macro#growth',
        title: 'GDP & Retail Sales',
        subtitle: 'GDP QoQ SAAR / Retail YoY',
        badge: 'Quarterly / Monthly',
        desc: 'Nominal GDP growth (Q/Q SAAR) and advance retail sales year-over-year. Source: BEA / Census via FRED.',
      },
    ],
  },
  {
    group: 'Private Consumption',
    color: '#16A085',
    bg: '#F0FAF8',
    border: '#50C4A8',
    items: [
      {
        href: '/us/consumption',
        title: 'PCE & Consumer Pulse',
        subtitle: 'PCE Inflation / Real Spending / Income / Saving',
        badge: 'Monthly',
        desc: 'Headline and core PCE, real consumption, disposable income, goods-services demand and the household saving buffer. Source: BEA via FRED.',
      },
    ],
  },
  {
    group: 'Surveys & Sentiment',
    color: '#16A085',
    bg: '#F0FAF8',
    border: '#50C4A8',
    items: [
      {
        href: '/us/manufacturing',
        title: 'Manufacturing Momentum',
        subtitle: 'NY Empire → Philly Fed → ISM',
        badge: 'Monthly Sequence',
        desc: 'Regional lead signals, national ISM anchor, release clock, component breadth and directional momentum. Sources: NY Fed / Philadelphia Fed / ISM.',
      },
    ],
  },
  {
    group: 'Employment & Wages',
    color: '#1A56DB',
    bg: '#F0F4FF',
    border: '#6B8FE8',
    items: [
      {
        href: '/us/employment',
        title: 'US Employment',
        subtitle: 'NFP / Unemployment / AHE',
        badge: 'Monthly',
        desc: 'Nonfarm payrolls, sector breakdown, U-3/U-6 unemployment, average hourly earnings by sector, and labor force participation. Source: BLS via FRED.',
      },
      {
        href: '/us/initial-claims',
        title: 'Initial Jobless Claims',
        subtitle: 'Claims / 4W Avg / Continued Claims',
        badge: 'Weekly',
        desc: 'High-frequency layoff signal, four-week trend, continued claims, insured unemployment and labor-stress regime. Source: ETA via FRED.',
      },
      {
        href: '/us/jolts',
        title: 'JOLTS Labor Market Pulse',
        subtitle: 'Openings / Hires / Quits / Layoffs',
        badge: 'Monthly',
        desc: 'Labor demand, turnover flows, worker confidence, employer stress and job openings relative to unemployment. Source: BLS via FRED.',
      },
    ],
  },
  {
    group: 'Monetary Policy',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#A78BFA',
    items: [
      {
        href: '/us-macro#fed-policy',
        title: 'Fed Policy',
        subtitle: 'Fed Funds Rate / FOMC',
        badge: 'Monthly',
        desc: 'Effective federal funds rate and next FOMC meeting schedule.',
      },
    ],
  },
]

export default function USHomePage() {
  return (
    <MacroWorkspace
      country="United States"
      countryCode="US"
      title="US Macro Dashboard"
      description="A focused view of US inflation, growth, consumption, surveys, labor and monetary policy from official sources."
      indicators={indicators}
      sourceNetwork="FRED · BLS · BEA"
    />
  )
}
