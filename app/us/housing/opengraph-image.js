import { createIndicatorOg, OG_SIZE } from '../../lib/indicator-og'

export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return createIndicatorOg({ eyebrow: 'UNITED STATES · HOUSING', title: 'Housing Cycle Monitor', subtitle: 'Construction, demand, financing and house-price momentum.', accent: '#42a9bc' })
}
