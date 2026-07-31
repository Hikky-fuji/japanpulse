'use client'

export default function GlobalError({ reset }) {
  return (
    <main className="dashboard-state dashboard-state--error" role="alert">
      <span className="dashboard-state__mark" aria-hidden="true">!</span>
      <div>
        <strong>Dashboard unavailable</strong>
        <p>The page could not be rendered. The underlying source may be temporarily unavailable.</p>
        <button className="dashboard-state__retry" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  )
}
