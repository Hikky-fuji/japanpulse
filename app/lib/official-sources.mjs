const source = (label, url) => ({ label, url })

export const OFFICIAL_SOURCES = {
  '/cpi': [source('Statistics Bureau · CPI', 'https://www.stat.go.jp/english/data/cpi/index.html')],
  '/tokyo-cpi': [source('Statistics Bureau · Tokyo CPI', 'https://www.stat.go.jp/english/data/cpi/index.html')],
  '/ppi': [source('BOJ · Price Indexes', 'https://www.boj.or.jp/en/statistics/pi/index.htm')],
  '/boj-policy': [source('BOJ · Outlook Report', 'https://www.boj.or.jp/en/mopo/outlook/index.htm')],
  '/yen-transmission': [source('BOJ · Time-Series Data', 'https://www.stat-search.boj.or.jp/index_en.html')],
  '/gdp': [source('Cabinet Office · National Accounts', 'https://www.esri.cao.go.jp/en/sna/sokuhou/sokuhou_top.html')],
  '/iip': [source('METI · Industrial Production', 'https://www.meti.go.jp/english/statistics/tyo/iip/index.html')],
  '/tsip': [source('METI · Tertiary Activity', 'https://www.meti.go.jp/english/statistics/tyo/sanzi/index.html')],
  '/machine-orders': [source('Cabinet Office · Machinery Orders', 'https://www.esri.cao.go.jp/en/stat/juchu/juchu-e.html')],
  '/consumption': [source('Statistics Bureau · Family Income & Expenditure', 'https://www.stat.go.jp/english/data/kakei/index.html')],
  '/housing': [
    source('e-Stat · Housing Starts', 'https://dashboard.e-stat.go.jp/en/timeSeriesResult?indicatorCode=0802010103000010001'),
    source('MLIT · Building Starts', 'https://www.e-stat.go.jp/en/stat-search/files?toukei=00600120'),
  ],
  '/tankan': [source('BOJ · Tankan', 'https://www.boj.or.jp/en/statistics/tk/index.htm')],
  '/watcher': [source('Cabinet Office · Economy Watchers', 'https://www5.cao.go.jp/keizai3/watcher-e/index-e.html')],
  '/wages': [source('MHLW · Labour Statistics', 'https://www.mhlw.go.jp/english/database/db-l/index.html')],
  '/labour': [source('Statistics Bureau · Labour Force Survey', 'https://www.stat.go.jp/english/data/roudou/index.html')],
  '/job-ratio': [source('MHLW · Employment Statistics', 'https://www.mhlw.go.jp/english/database/db-l/index.html')],
  '/trade': [source('Japan Customs · Trade Statistics', 'https://www.customs.go.jp/toukei/info/index_e.htm')],
  '/inbound-tourism': [source('JNTO · Visitor Statistics', 'https://www.jnto.go.jp/statistics/data/visitors-statistics/')],
  '/us/cpi': [source('BLS · Consumer Price Index', 'https://www.bls.gov/cpi/')],
  '/us/ppi': [source('BLS · Producer Price Index', 'https://www.bls.gov/ppi/')],
  '/us/consumption': [source('BEA · Personal Income & Outlays', 'https://www.bea.gov/data/income-saving/personal-income')],
  '/us/household-credit': [source('NY Fed · Household Debt & Credit', 'https://www.newyorkfed.org/microeconomics/hhdc')],
  '/us/retail-sales': [source('Census · Monthly Retail Trade', 'https://www.census.gov/retail/index.html')],
  '/us/housing': [
    source('Census · New Residential Construction', 'https://www.census.gov/construction/nrc/index.html'),
    source('FHFA · House Price Index', 'https://www.fhfa.gov/data/hpi'),
  ],
  '/us/manufacturing': [
    source('NY Fed · Empire State Survey', 'https://www.newyorkfed.org/survey/empire/empiresurvey_overview'),
    source('Philadelphia Fed · MBOS', 'https://www.philadelphiafed.org/surveys-and-data/regional-economic-analysis/mbos-historical-data'),
  ],
  '/us/employment': [source('BLS · Employment Situation', 'https://www.bls.gov/news.release/empsit.htm')],
  '/us/initial-claims': [source('DOL · Weekly Claims', 'https://www.dol.gov/agencies/eta/ui-claims')],
  '/us/jolts': [source('BLS · JOLTS', 'https://www.bls.gov/jlt/')],
  '/us/rates': [source('Federal Reserve · Selected Interest Rates', 'https://www.federalreserve.gov/releases/h15/')],
  '/us-macro': [
    source('BEA · GDP', 'https://www.bea.gov/data/gdp/gross-domestic-product'),
    source('Federal Reserve · FOMC', 'https://www.federalreserve.gov/monetarypolicy/fomc.htm'),
  ],
}

export function officialSourcesForPath(pathname) {
  return OFFICIAL_SOURCES[pathname] ?? []
}
