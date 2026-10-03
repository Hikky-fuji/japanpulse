export const revalidate = 3600
export const dynamic = 'force-dynamic'

import { fetchFredSeries } from '../../lib/fred.js'

export async function GET() {
  const apiKey = process.env.FRED_API_KEY
  const fallbackSeries = []

  const fetchFred = async (id, limit = 120, options = {}) => {
    try {
      return await fetchFredSeries(id, {
        apiKey,
        limit,
        startDate: options.startDate,
        revalidate,
        onFallback: seriesId => fallbackSeries.push(seriesId),
      })
    } catch (e) {
      console.warn(`[US-Emp] Failed ${id}:`, e.message)
      return []
    }
  }

  const [
    payems, unrate, u6rate, civpart, prime_part, ahe,
    goods, construction, wholesale, retail, transportation, utilities, info, fire, pbs, ehs, lah, govt,
    ahe_goods, ahe_constr, ahe_wholesale, ahe_retail, ahe_transport, ahe_util, ahe_info, ahe_fin, ahe_pro, ahe_edh, ahe_lei,
    sep_unrate_median, sep_unrate_longrun,
  ] = await Promise.all([
    // headline
    fetchFred('PAYEMS'),
    fetchFred('UNRATE'),
    fetchFred('U6RATE'),
    fetchFred('CIVPART'),
    fetchFred('LNS11300060'),
    fetchFred('CES0500000003'),
    // sector levels
    fetchFred('USGOOD'),
    fetchFred('USCONS'),
    fetchFred('USWTRADE'),
    fetchFred('USTRADE'),
    fetchFred('CES4300000001'),  // Transportation & Warehousing
    fetchFred('CES4422000001'),  // Utilities
    fetchFred('USINFO'),
    fetchFred('USFIRE'),
    fetchFred('USPBS'),
    fetchFred('USEHS'),
    fetchFred('USLAH'),
    fetchFred('USGOVT'),
    // sector AHE levels (for scatter: level $ and YoY %)
    fetchFred('CES0600000003'),  // Goods Producing
    fetchFred('CES2000000003'),  // Construction
    fetchFred('CES4142000003'),  // Wholesale
    fetchFred('CES4200000003'),  // Retail
    fetchFred('CES4300000003'),  // Transportation
    fetchFred('CES4422000003'),  // Utilities
    fetchFred('CES5000000003'),  // Information
    fetchFred('CES5500000003'),  // Financial
    fetchFred('CES6000000003'),  // Professional
    fetchFred('CES6500000003'),  // Edu & Health
    fetchFred('CES7000000003'),  // Leisure
    // FOMC Summary of Economic Projections
    fetchFred('UNRATEMD', 10, { startDate: '2010-01-01' }),    // Median Q4 unemployment projection by year
    fetchFred('UNRATEMDLR', 8, { startDate: '2010-01-01' }),   // Median longer-run unemployment estimate by SEP release
  ])

  return Response.json({
    meta: {
      delivery: fallbackSeries.length ? 'FRED API with official CSV fallback' : 'FRED API',
      fallbackSeries: [...new Set(fallbackSeries)],
    },
    employment: { payems, unrate, u6rate, civpart, prime_part, ahe },
    sectors:    { goods, construction, wholesale, retail, transportation, utilities, info, fire, pbs, ehs, lah, govt },
    sectorAhe:  {
      overall:      ahe,
      goods:        ahe_goods,
      construction: ahe_constr,
      wholesale:    ahe_wholesale,
      retail:       ahe_retail,
      transportation: ahe_transport,
      utilities:    ahe_util,
      info:         ahe_info,
      finance:      ahe_fin,
      professional: ahe_pro,
      eduHealth:    ahe_edh,
      leisure:      ahe_lei,
    },
    sep: {
      yearEnd: sep_unrate_median,
      longRun: sep_unrate_longrun,
    },
  })
}
