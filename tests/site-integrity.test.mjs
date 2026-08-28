import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { INDICATOR_GUIDES } from '../app/lib/indicator-guides.mjs'
import { OFFICIAL_SOURCES } from '../app/lib/official-sources.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = join(root, 'app')
const read = path => readFileSync(join(root, path), 'utf8')

function routeFile(pathname) {
  return pathname === '/'
    ? join(appRoot, 'page.js')
    : join(appRoot, pathname.slice(1), 'page.js')
}

function routeExists(pathname) {
  return existsSync(routeFile(pathname))
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

test('every macro-significance route has a complete analysis guide', () => {
  const significanceSource = read('app/lib/significance.js')
  const significancePaths = [...significanceSource.matchAll(/\n\s*['"](\/[^'"]+)['"]:\s*[123],/g)]
    .map(match => match[1])
    .sort()
  const guidePaths = Object.keys(INDICATOR_GUIDES).sort()

  assert.deepEqual(guidePaths, significancePaths)
  for (const [pathname, guide] of Object.entries(INDICATOR_GUIDES)) {
    assert.ok(routeExists(pathname), `${pathname} is missing page.js`)
    for (const field of ['why', 'signal', 'market', 'caveat']) {
      assert.ok(guide[field]?.length >= 25, `${pathname} has an incomplete ${field}`)
    }
    assert.ok(Array.isArray(guide.related) && guide.related.length >= 2, `${pathname} needs related indicators`)
    for (const related of guide.related) {
      assert.ok(routeExists(related.href), `${pathname} links to missing ${related.href}`)
    }
  }
})

test('guided indicator routes publish titles, descriptions and canonical URLs', () => {
  for (const pathname of Object.keys(INDICATOR_GUIDES)) {
    const layoutPath = join('app', pathname.slice(1), 'layout.js')
    assert.ok(existsSync(join(root, layoutPath)), `${pathname} is missing layout metadata`)
    const layout = read(layoutPath)
    assert.match(layout, /title\s*:/, `${pathname} is missing a metadata title`)
    assert.match(layout, /description\s*:/, `${pathname} is missing a metadata description`)
    assert.ok(
      layout.includes(`canonical: '${pathname}'`) || layout.includes(`canonical: "${pathname}"`),
      `${pathname} is missing its canonical URL`,
    )
  }
})

test('every guided indicator links to a concise set of primary official sources', () => {
  assert.deepEqual(Object.keys(OFFICIAL_SOURCES).sort(), Object.keys(INDICATOR_GUIDES).sort())
  for (const [pathname, sources] of Object.entries(OFFICIAL_SOURCES)) {
    assert.ok(sources.length >= 1 && sources.length <= 2, `${pathname} should have one or two official links`)
    for (const source of sources) {
      assert.ok(source.label.length >= 5, `${pathname} has an incomplete official-source label`)
      assert.match(source.url, /^https:\/\//, `${pathname} official source must use HTTPS`)
    }
  }
})

test('static internal links resolve to an App Router page', () => {
  const broken = []
  const files = walk(appRoot).filter(path => path.endsWith('.js') && !path.includes(`${join('app', 'api')}/`))

  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    const links = [...source.matchAll(/(?:href\s*=\s*|href\s*:\s*)[{'"`]?(\/[^'"`}\s]*)/g)]
      .map(match => match[1].split(/[?#]/)[0])
      .filter(path => path && !path.startsWith('/api/') && !path.includes('$'))
    for (const pathname of links) {
      if (!routeExists(pathname)) broken.push(`${relative(root, file)} -> ${pathname}`)
    }
  }

  assert.deepEqual(broken, [])
})

test('data-health API references existing API routes and pages', () => {
  const source = read('app/api/data-health/route.js')
  const apiPaths = [...source.matchAll(/path:\s*['"](\/api\/[^'"]+)['"]/g)].map(match => match[1])
  const pagePaths = [...source.matchAll(/href:\s*['"](\/[^'"#]+)(?:#[^'"]*)?['"]/g)].map(match => match[1])

  assert.ok(apiPaths.length >= 20, 'data-health coverage unexpectedly shrank')
  for (const apiPath of apiPaths) {
    assert.ok(existsSync(join(appRoot, apiPath.slice(1), 'route.js')), `missing ${apiPath}`)
  }
  for (const pathname of pagePaths) {
    assert.ok(routeExists(pathname), `health monitor links to missing ${pathname}`)
  }
})

test('public-quality routes and official dining series remain registered', () => {
  const sitemap = read('app/sitemap.js')
  const consumptionApi = read('app/api/us-consumption/route.js')
  const footer = read('app/components/SiteChrome.js')

  for (const pathname of [...Object.keys(INDICATOR_GUIDES), '/about', '/changelog', '/status']) {
    assert.ok(sitemap.includes(`path: '${pathname}'`), `${pathname} is missing from sitemap`)
  }
  assert.match(consumptionApi, /id:\s*'RSFSDP'/)
  assert.match(consumptionApi, /id:\s*'CUSR0000SEFV'/)
  assert.match(footer, /href="\/changelog"/)
})

test('retail and housing dashboards preserve official definitions and comparison discipline', () => {
  const retailApi = read('app/api/us-retail-sales/route.js')
  const usHousingApi = read('app/api/us-housing/route.js')
  const jpHousingApi = read('app/api/housing/route.js')
  const retailPage = read('app/us/retail-sales/page.js')

  for (const seriesId of ['RSAFS', 'RSFSXMV', 'MARTSSM44W72USS', 'RRSFS']) {
    assert.ok(retailApi.includes(`id: '${seriesId}'`), `retail API is missing ${seriesId}`)
  }
  for (const seriesId of ['HOUST', 'PERMIT', 'HSN1F', 'MORTGAGE30US', 'USSTHPI']) {
    assert.ok(usHousingApi.includes(`id: '${seriesId}'`), `US housing API is missing ${seriesId}`)
  }
  assert.match(jpHousingApi, /0802010103000010001/)
  assert.match(jpHousingApi, /contents of this service are not guaranteed/)
  assert.match(retailPage, /latest common MRTS month/i)
})

test('Japan and US navigators share a compact macro taxonomy and ordering', () => {
  const japanGroups = [...read('app/page.js').matchAll(/group:\s*\{\s*en:\s*'([^']+)'/g)]
    .map(match => match[1])
  const usGroups = [...read('app/us/page.js').matchAll(/group:\s*'([^']+)'/g)]
    .map(match => match[1])
  const commonGroups = [
    'Prices',
    'Growth & Business Activity',
    'Households & Housing',
    'Surveys & Sentiment',
    'Employment & Wages',
    'Policy & Financial Conditions',
  ]

  assert.deepEqual(usGroups, commonGroups)
  assert.deepEqual(japanGroups, [...commonGroups, 'External Sector'])
})

test('US CPI rent-of-shelter series matches its published relative-importance weight', () => {
  const api = read('app/api/us-cpi/route.js')
  const page = read('app/us/cpi/page.js')

  assert.match(api, /rentOfShelter:\s*\{ id: 'CUSR0000SAS2RS'/)
  assert.match(api, /rentOfShelter:\s*0\.35333/)
  assert.doesNotMatch(page, /payload\.contributionWeights\.shelter/)
})

test('household credit dashboard uses NY Fed flow definitions without re-annualizing', () => {
  const api = read('app/api/us-household-credit/route.js')
  const page = read('app/us/household-credit/page.js')

  assert.match(api, /Page 14 Data/)
  assert.match(api, /Four-quarter moving sum/)
  assert.match(page, /does not annualize or smooth them again/)
  assert.doesNotMatch(page, /3M ann\./)
})
