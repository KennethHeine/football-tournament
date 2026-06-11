---
name: schedule-share-links
description: Craft and verify fodbold.kscloud.io share links that produce a wanted schedule (specific matchups at specific times, who sits out when, match counts per team). Use when the user asks for a share link with schedule wishes, asks why the generated schedule looks a certain way, or asks whether a schedule constraint combination is possible.
---

# Crafting share links with schedule wishes

## How share links work (the key insight)

A share URL does **not** contain the schedule. It contains settings + team
names, and the app **regenerates the schedule deterministically** on load
(`parseTournamentShareParams` → `generateSchedule`). The only steering wheel
is the **order of the `team` params**. The `exclude=i-j` params are 0-based
indices into that order, so they must be remapped whenever the order changes
(`createTournamentShareParams` does this automatically).

Consequence: to satisfy a wish like "Solrød vs Herlufsholm at 10:00" or
"RB 2 must not sit out first", brute-force the team orderings (5 teams =
120 permutations, instant) and test each generated schedule.

## Workflow

1. Edit the constants at the top of `scripts/find-share-link.ts`
   (settings, team names, exclusions, mode) and express the wish in the
   `WANTED` predicate. Run:

   ```bash
   npx tsx scripts/find-share-link.ts
   ```

   The script round-trips every candidate URL through the real parser, so the
   printed schedule is exactly what the app will show.

2. Verify the link in a real browser (production or `npx vite --port 5199`):

   ```bash
   node scripts/verify-share-url.mjs "<url>" --channel msedge
   ```

   (`--channel msedge` uses system Edge — needed on machines where
   Playwright's Chromium download fails.)

3. Always keep the quality gates from `WANTED`: no conflicts (pre-checked),
   all slots full except possibly the last, and whatever counts the user
   asked for.

## Feasibility math (answer "is it possible?" before searching)

- Sum of per-team match counts must be **even** (every match consumes 2).
  E.g. 5 teams at {5,5,5,4,4} = 23 → impossible, no matter what.
- If teams A and B are excluded from meeting, their matches must come out of
  the other teams' capacity. With 5 teams, max 4 each, A–B excluded: A+B need
  8 games from the other three's 12 slots, leaving only 2 games among those
  three — so "all three meet each other" (3 games) is impossible; exactly one
  pairing must be dropped and replaced by rematches.
- Plain round-robin (no exclusions) on n teams: everyone plays n−1, every
  pair meets once — usually the best schedule when constraints allow it.

## Scheduler invariants (rely on these; tests enforce them)

- Time slots are synchronized: all matches in a slot start together; the next
  slot starts after `breakBetweenMatches`. Teams always get at least that
  break between their matches.
- Slots are packed to `numPitches`; under-filled slots are pushed to the end.
- Limited-matches mode equalizes counts: if excluded teams get stuck below
  `maxMatchesPerTeam`, it swaps a match between capped teams for two
  rematches (warning discloses which pair stops meeting / meets twice).
  `maxTotalMatches` caps this — e.g. 5 teams, max 4, one exclusion,
  `maxTotalMatches=9` keeps the unequalized 9-match schedule.

## Deploying scheduler changes

Push to `main` → `Deploy Production` workflow (lint, prettier `format:check`,
unit tests, Playwright e2e, build, deploy to Azure SWA). Watch with
`gh run watch <id> --exit-status`, then re-verify the live link with
`scripts/verify-share-url.mjs` — the run finishing "Run Tests" is not the
deploy; wait for the "Deploy to Production" job.
