import MacroWorkspace from '../components/MacroWorkspace'

const indicators = [
  {
    group: 'Employment & Labor',
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
    ],
  },
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
    group: 'Growth & Policy',
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
      description="A focused view of US inflation, labor, growth and monetary policy from official sources."
      indicators={indicators}
      sourceNetwork="FRED · BLS · BEA"
    />
  )
}
