# Monthly ISM Manufacturing snapshot update (scheduled agent prompt)

Owner-authorized on 2026-11-02: a scheduled agent performs the documented
manual ISM update (CLAUDE.md §4) once per release. The app itself never
fetches ISM data at runtime. Keep this file and the registered task in sync.

---

You are updating the ISM Manufacturing PMI snapshot of the Macro Data Monitor
repository after ISM's monthly release. Work autonomously, but stop and report
instead of merging whenever a check below fails. Report to the owner in
Japanese at the end.

## Context

- Repository: `/Users/fujimotohikaru/Documents/ChatGPT/JapanPulse`
  (GitHub `Hikky-fuji/macro-data-monitor`, default branch `main`, Vercel
  production `https://macro-data-monitor.vercel.app`).
- Read `CLAUDE.md` first. The snapshot is `ISM_SNAPSHOT` in
  `app/api/us-manufacturing/route.js`; the integrity test is
  `tests/site-integrity.test.mjs` ("the manually verified ISM snapshot has a
  current official period").
- ISM Manufacturing is released on the first business day of each month at
  10:00 a.m. America/New_York for the previous month (the reference month).
- Never print or commit secrets. Do not edit `.env*`. Do not touch unrelated
  files. The owner's working copy may contain uncommitted work: never modify,
  stash, reset or commit it. Do all work in a separate git worktree.

## Steps

1. Decide the reference month R = the calendar month before today
   (America/New_York). Read the current `ISM_SNAPSHOT`. If its last `headline`
   date is already R (first of month), report "already up to date" and stop.

2. Open the official report in the built-in browser (one visit only, no
   scripted or repeated fetching):
   `https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/pmi/<month>/`
   where `<month>` is R's English month name in lower case (e.g. `november`).
   On any cookie banner choose "Reject All". Read the page text.
   - The page title must say "<Month> <Year> ISM® Manufacturing PMI® Report"
     for R. If it still shows last year's report or an older month, the
     release is not out yet: report "not yet released" and stop.

3. From the "MANUFACTURING AT A GLANCE" table record, for R and the prior
   month: Manufacturing PMI, New Orders, Production, Employment, Supplier
   Deliveries, Inventories, Prices.
   Checks (stop and report if any fails):
   - mean(New Orders, Production, Employment, Supplier Deliveries,
     Inventories) is within ±0.15 of the PMI;
   - every value is between 20 and 90;
   - the prior-month PMI in the table equals the snapshot's last value. If it
     differs, ISM revised it: update that month too and say so in the PR.

4. Create a worktree from a fresh `origin/main`:
   `git -C <repo> fetch origin` then
   `git -C <repo> worktree add -b data/ism-<YYYY-MM> <tmpdir> origin/main`
   (`<tmpdir>` from `mktemp -d`). Install dependencies there with `npm ci`.

5. Edit, in the worktree only:
   - `ISM_SNAPSHOT.sourceUrl` → the page from step 2;
   - `verifiedAt` → today (YYYY-MM-DD, America/New_York);
   - `headline`: append `{ date: '<R>-01', value: <PMI> }` and drop the oldest
     entry so exactly 12 months remain;
   - `latest`: headline, newOrders, production, employment, pricesPaid
     (= Prices), inventories, supplierDeliveries for R;
   - `tests/site-integrity.test.mjs`: update the four ISM expectations
     (`pmi\/<month>\/`, `verifiedAt`, last history `date`/`value`,
     `headline`).
   Confirm `latest.headline` equals the final history value.

6. Validate in the worktree: `git diff --check`, `npm test`, `npm run build`.
   All must pass.

7. Commit (message: "Update ISM Manufacturing snapshot to <Month> <Year>",
   body listing the verified values and the component-average check), ending
   with the line
   `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
   Push the branch and open a PR to `main` with `gh pr create`; the body lists
   the values, the checks and the official URL, and ends with
   `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

8. Wait for the PR checks (`gh pr checks <n> --watch`). Merge only if
   `build-and-test` and the Vercel deployment pass:
   `gh pr merge <n> --merge --delete-branch`.

9. Verify production: poll
   `https://macro-data-monitor.vercel.app/api/us-manufacturing` until
   `ism.verifiedAt` is today and the last `ism.headline` date is R (about
   15 s between polls, at most 10 minutes), then run `npm run smoke:production`
   from the worktree. Open `/us/manufacturing` once and confirm the ISM-tracking
   table shows R's ISM value and there are no console errors.

10. Clean up: `git -C <repo> worktree remove <tmpdir>` (and delete the local
    branch if it still exists). Do not touch the owner's working copy.

11. Report in Japanese: the reference month, PMI and components, the change
    from the prior month, the four-district ISM-equivalent composite and its
    gap to ISM for R (from the production API: average of each district's
    five components converted as 50 + DI/2), the PR link, and what was
    verified. If you stopped early, say exactly why and what the owner should
    do.
