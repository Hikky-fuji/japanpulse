import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { CHART_ORDERS, SERIES_COLORS } from '../app/lib/series-colors.mjs'
import { HEADLINE_BLOCKS, INCOME_COMPONENTS } from '../app/lib/us-pce-metrics.mjs'

const hex = /^#[0-9a-f]{6}$/

test('every concept has one valid color', () => {
  for (const [concept, color] of Object.entries(SERIES_COLORS)) assert.match(color, hex, concept)
})

test('validated chart orders name known concepts with distinct colors', () => {
  for (const [chart, order] of Object.entries(CHART_ORDERS)) {
    order.forEach(concept => assert.ok(SERIES_COLORS[concept], `${chart}: unknown concept ${concept}`))
    const colors = order.map(concept => SERIES_COLORS[concept])
    assert.equal(new Set(colors).size, colors.length, `${chart} reuses a color`)
  }
})

test('core inflation concepts keep separate colors', () => {
  const primary = ['headline', 'core', 'food', 'energy', 'goods', 'services', 'supercore', 'shelter']
  assert.equal(new Set(primary.map(concept => SERIES_COLORS[concept])).size, primary.length)
})

test('PCE helper series take their colors from the registry', () => {
  HEADLINE_BLOCKS.forEach(block => assert.equal(block.color, SERIES_COLORS[block.key], block.key))
  assert.deepEqual(HEADLINE_BLOCKS.map(block => block.key), CHART_ORDERS.headlineSplit)
  assert.deepEqual(INCOME_COMPONENTS.map(item => item.color), CHART_ORDERS.incomeSources.map(concept => SERIES_COLORS[concept]))
})

// Pages may not hard-code a hex color on a dataset for a registered concept;
// they must take it from series-colors.mjs so one concept keeps one color.
const PAGES = [
  'app/us/cpi/page.js',
  'app/components/JapanCpiDashboard.js',
  'app/us/consumption/page.js',
  'app/us/employment/page.js',
  'app/us/manufacturing/page.js',
  'app/us-macro/page.js',
  'app/wages/page.js',
  'app/boj-policy/page.js',
]
const CONCEPT_LABEL = /label: ['`][^'`]*(headline|core|food|energy|supercore|median|trimmed|mode|sticky|u-3|u-6|unemployment|wage|ahe|participation|ism|taylor|fed funds|goods|services|shelter)/i

test('core pages color registered concepts from the shared registry', () => {
  for (const path of PAGES) {
    const lines = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n')
    lines.forEach((line, index) => {
      if (!CONCEPT_LABEL.test(line)) return
      // A dataset is written on one line or spread over the next few lines.
      const block = lines.slice(index, index + 8).join('\n').split(/\n\s*\}/)[0]
      // The panel-colored separator between stacked bars is not a series color.
      const literals = [...block.matchAll(/borderColor:\s*'(#[0-9a-fA-F]{3,6})'/g)].map(match => match[1].toLowerCase())
      assert.deepEqual(literals.filter(color => color !== '#30363a'), [], `${path}:${index + 1} hard-codes a concept color`)
      // Generic hue names (COLORS.orange …) say nothing about the concept; use the registry key.
      assert.doesNotMatch(block, /borderColor:\s*COLORS\.(orange|blue|green|red|violet|purple|teal|yellow)\b/, `${path}:${index + 1} uses a generic hue for a concept`)
    })
  }
})
