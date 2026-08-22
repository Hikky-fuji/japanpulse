import MacroWorkspace from '../components/MacroWorkspace'

export const metadata = {
  title: {
    absolute: 'US Macro Dashboard | JapanPulse',
  },
  description:
    'US macro dashboard covering CPI, PPI, GDP, consumption, surveys, employment, Fed policy, rates and financial conditions.',
  alternates: {
    canonical: '/us',
  },
  openGraph: {
    title: 'US Macro Dashboard | JapanPulse',
    description: 'Track US inflation, growth, consumption, surveys, labor, monetary policy and financial conditions from official sources.',
    url: '/us',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'JapanPulse Macro Workspace',
      },
    ],
  },
}

const indicators = [
  {
    group: 'Prices',
    color: '#E67E22',
    bg: '#FFF8F0',
    border: '#F0A050',
    items: [
      {
        href: '/us/cpi',
        significance: 3,
        title: 'CPI & Inflation',
        subtitle: 'Headline / Core / Base Effects / Scenario Lab',
        badge: 'Monthly',
        desc: 'Tracks underlying price pressure and maps 0.2%–0.4% monthly CPI paths into future year-over-year inflation.',
      },
      {
        href: '/us/ppi',
        significance: 2,
        title: 'PPI & Pipeline Inflation',
        subtitle: 'Headline / Core / Core ex Trade',
        badge: 'Monthly',
        desc: 'Measures pipeline price pressure before it reaches consumer inflation.',
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
        significance: 3,
        title: 'GDP & Retail Sales',
        subtitle: 'GDP QoQ SAAR / Retail YoY',
        badge: 'Quarterly / Monthly',
        desc: 'Combines broad economic growth with timely consumer-demand momentum.',
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
        significance: 3,
        title: 'PCE & Consumer Pulse',
        subtitle: 'PCE Inflation / Real Spending / Income / Saving',
        badge: 'Monthly',
        desc: 'Tracks the Fed’s preferred inflation gauge alongside real spending, income and saving.',
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
        significance: 3,
        title: 'Manufacturing Momentum',
        subtitle: 'NY Empire → Philly Fed → ISM',
        badge: 'Monthly Sequence',
        desc: 'Sequences NY, Philadelphia and ISM surveys to detect shifts in factory momentum.',
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
        significance: 3,
        title: 'US Employment',
        subtitle: 'NFP / Unemployment / AHE',
        badge: 'Monthly',
        desc: 'Tracks hiring, unemployment, wages and participation to assess labor-market strength.',
      },
      {
        href: '/us/initial-claims',
        significance: 2,
        title: 'Initial Jobless Claims',
        subtitle: 'Claims / 4W Avg / Continued Claims',
        badge: 'Weekly',
        desc: 'Provides an early weekly signal of layoffs and labor-market deterioration.',
      },
      {
        href: '/us/jolts',
        significance: 2,
        title: 'JOLTS Labor Market Pulse',
        subtitle: 'Openings / Hires / Quits / Layoffs',
        badge: 'Monthly',
        desc: 'Measures labor demand, worker confidence and turnover through openings, quits and layoffs.',
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
        significance: 3,
        title: 'Fed Policy',
        subtitle: 'Fed Funds / Taylor Rules / FOMC',
        badge: 'Monthly',
        desc: 'Compares the policy rate with rule-based benchmarks and the FOMC calendar.',
      },
    ],
  },
  {
    group: 'Financial Conditions',
    color: '#42A9BC',
    bg: '#F0FAFC',
    border: '#70C2D0',
    items: [
      {
        href: '/us/rates',
        significance: 3,
        title: 'Rates & Financial Conditions',
        subtitle: 'Yield Curve / Real Yields / Breakevens / NFCI',
        badge: 'Daily / Weekly',
        desc: 'Connects the yield curve, real rates, inflation compensation and financial conditions.',
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
      description="A focused view of US inflation, growth, consumption, surveys, labor, monetary policy and financial conditions from official sources."
      indicators={indicators}
      sourceNetwork="FRED · BLS · BEA"
    />
  )
}
