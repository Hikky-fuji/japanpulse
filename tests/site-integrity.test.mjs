import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { INDICATOR_GUIDES } from '../app/lib/indicator-guides.mjs'

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
