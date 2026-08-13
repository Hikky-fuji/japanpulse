import MacroWorkspace from './components/MacroWorkspace'

export const metadata = {
  title: {
    absolute: 'Japan Macro Dashboard | JapanPulse',
  },
  description:
    'Japan macro dashboard covering inflation, GDP, production, consumption, surveys, employment, wages and trade from official sources.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Japan Macro Dashboard | JapanPulse',
    description: 'A high-density view of Japan macro conditions from e-Stat, BOJ, MOF and other official sources.',
    url: '/',
  },
}

const indicators = [
  {
    group: { en: 'Prices', ja: '物価' },
    color: '#E67E22',
    bg: '#FFF8F0',
    border: '#F0A050',
    items: [
      {
        href: '/cpi',
        significance: 3,
        title:    { en: 'CPI (Consumer Prices)',         ja: 'CPI（消費者物価指数）' },
        subtitle: { en: 'National / Core / Core-Core',   ja: '全国 / コア / コアコア' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'National consumer price index. Primary indicator for BOJ inflation target.',
                    ja: '全国消費者物価指数。日銀のインフレ目標を判断する主要指標。' },
      },
      {
        href: '/tokyo-cpi',
        significance: 2,
        title:    { en: 'Tokyo CPI',                     ja: '東京都区部 CPI' },
        subtitle: { en: 'Tokyo Metropolitan Area',       ja: '東京都区部' },
        badge:    { en: 'Monthly / Leading Indicator',   ja: '月次 / 先行指標' },
        badgeColor: '#2980B9',
        desc:     { en: 'Released ~3 weeks before national CPI. Widely watched as a leading indicator.',
                    ja: '全国CPI発表の約3週間前に公表。先行指標として注目度が高い。' },
      },
      {
        href: '/ppi',
        significance: 2,
        title:    { en: 'PPI (Producer Prices)',         ja: 'PPI（企業物価指数）' },
        subtitle: { en: 'CGPI / SPPI',                  ja: 'CGPI / SPPI' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Domestic corporate, import/export, and services prices. Leading signal for upstream inflation.',
                    ja: '国内・輸出入・サービス価格。上流インフレの先行シグナル。' },
      },
    ],
  },
  {
    group: { en: 'Economic Growth', ja: '経済成長' },
    color: '#27AE60',
    bg: '#F0FAF4',
    border: '#5DBF80',
    items: [
      {
        href: '/gdp',
        significance: 3,
        title:    { en: 'GDP (Gross Domestic Product)',  ja: 'GDP（国内総生産）' },
        subtitle: { en: 'Real / Seasonally Adjusted',   ja: '実質 / 季節調整済み' },
        badge:    { en: 'Quarterly',                     ja: '四半期' },
        desc:     { en: 'Real GDP growth rate (Q/Q, Y/Y) with contribution breakdown. 2020 base.',
                    ja: '実質GDP成長率（Q/Q・Y/Y）と寄与度内訳。2020年基準。' },
      },
      {
        href: '/iip',
        significance: 2,
        title:    { en: 'Industrial Production Index',  ja: '鉱工業生産指数（IIP）' },
        subtitle: { en: 'IIP',                          ja: 'IIP' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Index of manufacturing and mining production activity. Leading indicator for economic conditions.',
                    ja: '製造業・鉱業の生産活動指数。景気の先行指標。' },
      },
      {
        href: '/tsip',
        significance: 2,
        title:    { en: 'Tertiary Sector Activity Index', ja: '第3次産業活動指数（TSIP）' },
        subtitle: { en: 'TSIP by sector',               ja: '業種別' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Service sector activity covering IT, retail, medical, hospitality and more. ~70% of Japan\'s GDP.',
                    ja: 'サービス業の活動指数。情報通信・小売・医療・宿泊等。日本GDPの約70%を占めるサービス部門。' },
      },
    ],
  },
  {
    group: { en: 'Corporate & Business Activity', ja: '企業・事業活動' },
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#A78BFA',
    items: [
      {
        href: '/machine-orders',
        significance: 2,
        title:    { en: 'Machine Orders',                  ja: '機械受注' },
        subtitle: { en: 'Core Private Orders (ex-Ships/Elec)', ja: '民需（船舶・電力除く）' },
        badge:    { en: 'Monthly',                         ja: '月次' },
        desc:     { en: 'Leading indicator for capital expenditure, 6-9M ahead of GDP capex.',
                    ja: 'GDP設備投資の6〜9ヶ月先行指標。コア機械受注の前年比・前月比。' },
      },
    ],
  },
  {
    group: { en: 'Private Consumption', ja: '個人消費' },
    color: '#9B59B6',
    bg: '#FAF0FF',
    border: '#C080E0',
    items: [
      {
        href: '/consumption',
        significance: 2,
        title:    { en: 'Household Consumption',        ja: '家計消費' },
        subtitle: { en: 'Family Income & Expenditure Survey', ja: '家計調査' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Consumption spending of 2+ person households. Real and nominal private consumption trends.',
                    ja: '2人以上世帯の消費支出。実質・名目の個人消費動向。' },
      },
    ],
  },
  {
    group: { en: 'Surveys & Sentiment', ja: '景況調査・センチメント' },
    color: '#16A085',
    bg: '#F0FAF8',
    border: '#50C4A8',
    items: [
      {
        href: '/tankan',
        significance: 3,
        title:    { en: 'Tankan Survey',                ja: '日銀短観' },
        subtitle: { en: 'Business Conditions DI',       ja: '業況判断DI' },
        badge:    { en: 'Quarterly',                     ja: '四半期' },
        desc:     { en: 'BOJ quarterly business sentiment survey. DI for large manufacturers and non-manufacturers, enterprise size breakdown, and forecast accuracy.',
                    ja: '日銀の四半期景況調査。大企業製造業・非製造業のDI、規模別内訳、予測精度を掲載。' },
      },
      {
        href: '/watcher',
        significance: 2,
        title:    { en: 'Economy Watchers',             ja: '景気ウォッチャー調査' },
        subtitle: { en: 'Current / Outlook DI vs. Nikkei', ja: '現状・先行きDI vs 日経平均' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Cabinet Office street-level sentiment survey. Current and outlook DI by sector (households, corporate, employment) overlaid with Nikkei 225.',
                    ja: '内閣府の景気ウォッチャー調査。家計・企業・雇用関連の現状・先行きDIと日経平均の推移を掲載。' },
      },
    ],
  },
  {
    group: { en: 'Employment & Wages', ja: '雇用・賃金' },
    color: '#1A56DB',
    bg: '#F0F4FF',
    border: '#6B8FE8',
    items: [
      {
        href: '/wages',
        significance: 3,
        title:    { en: 'Monthly Labor Survey',         ja: '毎月勤労統計調査' },
        subtitle: { en: 'Nominal / Real Wages',         ja: '名目 / 実質賃金' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Nominal/real wage index (Y/Y), scheduled wages, part-time ratio. Published by MHLW.',
                    ja: '名目・実質賃金指数（Y/Y）、所定内給与、パート比率。厚生労働省公表。' },
      },
      {
        href: '/labour',
        significance: 3,
        title:    { en: 'Labour Force Survey',          ja: '労働力調査' },
        subtitle: { en: 'Unemployment / Employment / Participation', ja: '完全失業率 / 就業者数 / 労働参加率' },
        badge:    { en: 'Monthly · SA',                 ja: '月次 · 季調済' },
        desc:     { en: 'Unemployment rate (SA), employed persons (YoY), labor force participation rate. Source: Statistics Bureau.',
                    ja: '完全失業率（季節調整値）、就業者数（前年比）、労働参加率。総務省 統計局。' },
      },
      {
        href: '/job-ratio',
        significance: 2,
        title:    { en: 'Job-to-Applicant Ratio',       ja: '有効求人倍率' },
        subtitle: { en: 'Job Market Tightness',         ja: '需給バランス' },
        badge:    { en: 'Monthly · SA',                 ja: '月次 · 季調済' },
        desc:     { en: 'Effective job-to-applicant ratio (SA). Key indicator of labor demand-supply balance watched by BOJ.',
                    ja: '有効求人倍率（季節調整値）。日銀が注目する労働需給バランスの主要指標。' },
      },
    ],
  },
  {
    group: { en: 'Trade', ja: '貿易' },
    color: '#0E7490',
    bg: '#F0FDFF',
    border: '#67C8D4',
    items: [
      {
        href: '/trade',
        significance: 2,
        title:    { en: 'Trade Statistics',             ja: '貿易統計' },
        subtitle: { en: 'Export / Import / Balance',    ja: '輸出 / 輸入 / 貿易収支' },
        badge:    { en: 'Monthly',                       ja: '月次' },
        desc:     { en: 'Japan trade statistics: exports, imports, trade balance by commodity and destination. Source: MOF Customs.',
                    ja: '日本の貿易統計：品目別・仕向地別の輸出入・貿易収支。財務省税関。' },
      },
      {
        href: '/inbound-tourism',
        significance: 2,
        title:    { en: 'Inbound Tourism & Services Exports', ja: '訪日外国人・サービス輸出' },
        subtitle: { en: 'Arrivals / Spending / Accommodation', ja: '訪日客数 / 消費額 / 宿泊' },
        badge:    { en: 'Monthly / Quarterly', ja: '月次 / 四半期' },
        desc:     { en: 'Visitor volumes, source-market breadth, travel spending, spend per visitor and foreign guest nights. Sources: JNTO / Japan Tourism Agency.',
                    ja: '訪日客数、国別の広がり、旅行消費額、1人当たり支出、外国人延べ宿泊者数。JNTO・観光庁。' },
      },
    ],
  },
]

export default function HomePage() {
  return (
    <MacroWorkspace
      country="Japan"
      countryCode="JP"
      title="Japan Macro Dashboard"
      description={{
        en: "A high-density view of Japan's key economic indicators, updated from official sources.",
        ja: '日本の主要経済指標を、公的統計から自動更新する高密度ダッシュボード。',
      }}
      indicators={indicators}
      bilingual
      sourceNetwork="e-Stat · BOJ · MOF · JNTO"
    />
  )
}
