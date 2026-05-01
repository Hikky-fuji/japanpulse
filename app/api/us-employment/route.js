export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) return Response.json({ error: 'FRED_API_KEY not set' })

  const fetchFred = async (id, limit = 120) => {
    try {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=${id}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) { console.warn(`[US-Emp] HTTP ${res.status} for ${id}`); return [] }
      const json = await res.json()
      if (json.error_message) { console.warn(`[US-Emp] ${id}:`, json.error_message); return [] }
      return (json.observations || [])
        .filter(o => o.value !== '.')
        .map(o => ({ date: o.date, value: parseFloat(o.value) }))
        .reverse()
    } catch (e) {
      console.warn(`[US-Emp] Failed ${id}:`, e.message)
      return []
    }
  }

  const [
    payems, unrate, u6rate, civpart, prime_part, ahe,
    goods, construction, wholesale, retail, transportation, utilities, info, fire, pbs, ehs, lah, govt,
    ahe_goods, ahe_constr, ahe_wholesale, ahe_retail, ahe_transport, ahe_util, ahe_info, ahe_fin, ahe_pro, ahe_edh, ahe_lei,
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
  ])

  return Response.json({
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
  })
}
