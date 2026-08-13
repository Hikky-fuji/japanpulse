import Link from 'next/link'

export const metadata = {
  title: 'About & Methodology',
  description:
    'JapanPulse purpose, data sources, update methodology, limitations, attribution and research disclaimer.',
  alternates: {
    canonical: '/about',
  },
}

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-page__hero">
        <div className="about-page__eyebrow">ABOUT / METHODOLOGY</div>
        <h1>Built to make macro data faster to read.</h1>
        <p>
          JapanPulse is an independent research workspace that brings Japan and United States
          macroeconomic indicators into a consistent, high-density dashboard. It is designed
          for monitoring direction, momentum and cross-indicator context—not for replacing
          the underlying official releases.
        </p>
      </section>

      <section className="about-page__grid">
        <article>
          <h2>Data sources</h2>
          <ul>
            <li>Japan: e-Stat, Bank of Japan, Cabinet Office, METI, MHLW and Japan Customs.</li>
            <li>United States: BLS, BEA, Census, Federal Reserve, U.S. Treasury and Chicago Fed data via FRED.</li>
            <li>Every dashboard identifies its source and latest available observation.</li>
          </ul>
        </article>

        <article>
          <h2>Update policy</h2>
          <p>
            Data is retrieved from official APIs or published files and cached to reduce load.
            Release timing differs by indicator, so “latest” means the newest official
            observation available for that series—not a common calendar month across all pages.
          </p>
          <p>
            The <Link href="/status">Data Status monitor</Link> identifies current, reference,
            stale and failed feeds and separates live data from preserved snapshots.
          </p>
        </article>

        <article>
          <h2>Methodology</h2>
          <p>
            Growth rates, annualized momentum and contributions are calculated from published
            index levels where noted. Seasonal-adjustment status and transformation definitions
            are shown on individual dashboards. Survey and hard-data indicators remain
            separated to avoid false comparability.
          </p>
          <p>
            Market-implied measures such as Treasury breakevens are treated as pricing signals,
            not pure forecasts. They can include risk, liquidity and term premia in addition to
            expectations.
          </p>
        </article>

        <article id="macro-significance">
          <h2>Macro significance</h2>
          <p>
            Dashboard stars are an editorial monitoring hierarchy—not a rating of data quality,
            reliability or forecast accuracy. <strong>★★★ Core</strong> indicators have broad
            cycle, policy or market relevance. <strong>★★ Supporting</strong> indicators add
            timely confirmation, leading detail or a transmission channel. <strong>★ Specialized</strong>
            indicators answer a narrower sector question and are best read with broader data.
          </p>
        </article>

        <article>
          <h2>Known limitations</h2>
          <ul>
            <li>Official data can be revised after initial publication.</li>
            <li>Some source files do not expose stable API identifiers and are labeled as reference snapshots.</li>
            <li>Series can have different release lags, base years and seasonal-adjustment methods.</li>
          </ul>
        </article>

        <article className="is-wide about-page__notice">
          <h2>FRED attribution and disclaimer</h2>
          <p>
            This product uses the FRED® API but is not endorsed or certified by the Federal
            Reserve Bank of St. Louis. Source attribution on US dashboards identifies both the
            original publisher and FRED. Use of FRED data is subject to the{' '}
            <a href="https://fred.stlouisfed.org/docs/api/terms_of_use.html" rel="noreferrer" target="_blank">
              FRED API Terms of Use
            </a>.
          </p>
        </article>

        <article className="is-wide">
          <h2>Research disclaimer & feedback</h2>
          <p>
            JapanPulse is provided for informational and educational purposes only. It does not
            constitute investment, legal, tax or other professional advice. Verify important
            figures against the linked official release before making decisions.
          </p>
          <div className="about-page__actions">
            <a href="https://github.com/Hikky-fuji/japanpulse/issues" rel="noreferrer" target="_blank">
              Report a data or display issue ↗
            </a>
            <Link href="/status">Check data status</Link>
          </div>
        </article>
      </section>
    </main>
  )
}
