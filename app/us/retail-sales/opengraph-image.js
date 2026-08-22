import { createIndicatorOg, OG_SIZE } from '../../lib/indicator-og'

export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return createIndicatorOg({
    eyebrow: 'UNITED STATES · PRIVATE CONSUMPTION',
    title: 'Retail Demand Monitor',
    subtitle: 'Advance sales, real spending momentum and category breadth.',
    accent: '#60d4af',
  })
}
