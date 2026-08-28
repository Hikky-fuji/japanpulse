const finite = value => Number.isFinite(value)

export function movingAverage(series, window = 3) {
  return (series || []).map((point, index, observations) => {
    if (index < window - 1) return { date: point.date, value: null }
    const sample = observations.slice(index - window + 1, index + 1).map(item => item.value)
    if (!sample.every(finite)) return { date: point.date, value: null }
    return {
      date: point.date,
      value: sample.reduce((sum, value) => sum + value, 0) / window,
    }
  })
}

export function yoyMomentum(series, monthlySeries) {
  const observations = series || []
  const latest = observations.at(-1)
  const previous = observations.at(-2)
  const averages = movingAverage(observations, 3)
  const latestAverage = averages.at(-1)?.value
  const previousAverage = averages.at(-2)?.value
  const latestMonthly = (monthlySeries || []).find(point => point.date === latest?.date)

  return {
    date: latest?.date,
    yoy: finite(latest?.value) ? latest.value : null,
    yoyChange: finite(latest?.value) && finite(previous?.value)
      ? latest.value - previous.value
      : null,
    mma3: finite(latestAverage) ? latestAverage : null,
    mma3Change: finite(latestAverage) && finite(previousAverage)
      ? latestAverage - previousAverage
      : null,
    monthlyNsa: finite(latestMonthly?.value) ? latestMonthly.value : null,
  }
}

export function momentumSignal(change, threshold = 0.05) {
  if (!finite(change)) return 'Unavailable'
  if (change > threshold) return 'Accelerating'
  if (change < -threshold) return 'Cooling'
  return 'Stable'
}
