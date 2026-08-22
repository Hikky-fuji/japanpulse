import { createIndicatorOg, OG_SIZE } from '../lib/indicator-og'

export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return createIndicatorOg({ eyebrow: 'JAPAN · HOUSING', title: 'Housing Starts Monitor', subtitle: 'Construction levels and momentum across housing tenure.', accent: '#42a9bc' })
}
