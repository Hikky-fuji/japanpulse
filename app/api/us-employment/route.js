export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) return Response.json({ error: 'FRED_API_KEY not set' })

  const fetchFred = async (id, limit = 40) => {
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
    goods, construction, wholesale, retail, info, fire, pbs, ehs, lah, govt,
    ahe_goods, ahe_constr, ahe_wholesale, ahe_retail, ahe_info, ahe_fin, ahe_pro, ahe_edh, ahe_lei,
  ] = await Promise.all([
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
    fetchFred('USINFO'),
    fetchFred('USFIRE'),
    fetchFred('USPBS'),
    fetchFred('USEHS'),
    fetchFred('USLAH'),
    fetchFred('USGOVT'),
    // sector AHE
    fetchFred('CES0600000003'),
    fetchFred('CES2000000003'),
    fetchFred('CES4142000003'),
    fetchFred('CES4200000003'),
    fetchFred('CES5000000003'),
    fetchFred('CES5500000003'),
    fetchFred('CES6000000003'),
    fetchFred('CES6500000003'),
    fetchFred('CES7000000003'),
  ])

  return Response.json({
    employment: { payems, unrate, u6rate, civpart, prime_part, ahe },
    sectors:    { goods, construction, wholesale, retail, info, fire, pbs, ehs, lah, govt },
    sectorAhe:  { goods: ahe_goods, construction: ahe_constr, wholesale: ahe_wholesale, retail: ahe_retail, info: ahe_info, finance: ahe_fin, professional: ahe_pro, eduHealth: ahe_edh, leisure: ahe_lei },
  })
}
