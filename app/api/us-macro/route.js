export const dynamic = 'force-dynamic'

export async function GET() {
  console.log('⚠️ Remember to add FRED_API_KEY to Vercel Environment Variables')

  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'FRED_API_KEY not set' })
  }

  const fetchSeries = async (seriesId, limit = 36) => {
    try {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=${seriesId}` +
        `&api_key=${apiKey}` +
        `&file_type=json` +
        `&sort_order=desc` +
        `&limit=${limit}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        console.warn(`[US Macro] HTTP ${res.status} for ${seriesId}`)
        return []
      }
      const json = await res.json()
      if (json.error_message) {
        console.warn(`[US Macro] FRED error for ${seriesId}:`, json.error_message)
        return []
      }
      const obs = json.observations || []
      return obs
        .filter(o => o.value !== '.')
        .map(o => ({ date: o.date, value: parseFloat(o.value) }))
        .reverse()
    } catch (e) {
      console.warn(`[US Macro] Failed to fetch ${seriesId}:`, e.message)
      return []
    }
  }

  const [
    payems, unrate, u6rate, civpart, prime_part, ahe,
    goods, construction, trade, info, fire, pbs, ehs, lah, govt,
    ahe_goods, ahe_privsvr, ahe_constr, ahe_retail, ahe_info, ahe_fin, ahe_pro, ahe_edh, ahe_lei,
    cpi, coreCpi, gdp, retail, fedfunds,
  ] = await Promise.all([
    fetchSeries('PAYEMS'),
    fetchSeries('UNRATE'),
    fetchSeries('U6RATE'),
    fetchSeries('CIVPART'),
    fetchSeries('LNS11300060'),
    fetchSeries('CES0500000003'),
    fetchSeries('USGOOD'),
    fetchSeries('USCONS'),
    fetchSeries('USTRADE'),
    fetchSeries('USINFO'),
    fetchSeries('USFIRE'),
    fetchSeries('USPBS'),
    fetchSeries('USEHS'),
    fetchSeries('USLAH'),
    fetchSeries('USGOVT'),
    fetchSeries('CES0600000003'),
    fetchSeries('CES0800000003'),
    fetchSeries('CES2000000003'),
    fetchSeries('CES4200000003'),
    fetchSeries('CES5000000003'),
    fetchSeries('CES5500000003'),
    fetchSeries('CES6000000003'),
    fetchSeries('CES6500000003'),
    fetchSeries('CES7000000003'),
    fetchSeries('CPIAUCSL'),
    fetchSeries('CPILFESL'),
    fetchSeries('GDP', 8),
    fetchSeries('RSAFS'),
    fetchSeries('FEDFUNDS'),
  ])

  return Response.json({
    employment: { nfp: payems, unrate, u6rate, civpart, prime_part, ahe },
    sectors: { goods, construction, trade, info, fire, pbs, ehs, lah, govt },
    wages: {
      bySector: {
        goods_prod:   ahe_goods,
        private_srv:  ahe_privsvr,
        construction: ahe_constr,
        retail:       ahe_retail,
        info:         ahe_info,
        finance:      ahe_fin,
        professional: ahe_pro,
        edu_health:   ahe_edh,
        leisure:      ahe_lei,
      },
    },
    inflation: { cpi, coreCpi },
    growth:    { gdp, retail },
    policy:    { fedfunds },
  })
}
