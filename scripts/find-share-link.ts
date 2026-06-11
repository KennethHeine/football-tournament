/**
 * Search harness for crafting share links that produce a wanted schedule.
 *
 * Share links do NOT store the schedule — the app regenerates it
 * deterministically from the settings, and the only steering wheel is the
 * ORDER of the teams (plus order-dependent `exclude` indices). This script
 * brute-forces team orderings and prints the first link whose generated
 * schedule satisfies WANTED below.
 *
 * Usage: edit SETTINGS / TEAM_NAMES / CONFIG / WANTED, then run
 *   npx tsx scripts/find-share-link.ts
 */
import { generateSchedule } from '../src/lib/scheduler'
import { createTournamentShareUrl, parseTournamentShareParams } from '../src/lib/share-url'
import type {
  Team,
  TournamentSettings,
  SchedulingConfig,
  GeneratedSchedule,
} from '../src/lib/types'

// ── Tournament setup (mirror the user's existing link) ──────────────────────
const SETTINGS: TournamentSettings = {
  name: 'RB hjemmebane - A - 14/6',
  startDate: '2026-06-14',
  startTime: '10:00',
  numPitches: 2,
  pitchNames: ['Bane 1', 'Bane 2'],
  matchMode: 'two-halves',
  halfDurationMinutes: 9,
  halftimeBreakMinutes: 2,
  breakBetweenMatches: 5,
}

const TEAM_NAMES = ['Solrød', 'RB 2', 'Karlslunde', 'RB 1', 'Herlufsholm']

// Pairs are team NAMES; they are translated to ids per permutation so the
// exclusion follows the teams, not their positions
const EXCLUDED_NAME_PAIRS: [string, string][] = [['RB 2', 'RB 1']]

const CONFIG: Omit<SchedulingConfig, 'excludedMatchups'> = {
  mode: 'limited-matches',
  maxMatchesPerTeam: 4,
}

// ── The wish: return true if this generated schedule is acceptable ──────────
function WANTED(s: Helpers): boolean {
  // Examples (combine freely):
  //   s.firstSlotHas('Solrød', 'Herlufsholm')      — specific 10:00 match
  //   !s.firstSlotIdle().includes('Solrød')        — who must not sit out first
  //   s.counts.get('RB 1') === 4                   — per-team match count
  //   s.pairs.get(s.pairKey('RB 1', 'RB 2')) === undefined — pair never meets
  return s.allSlotsFullExceptLast()
}

// ── Helpers handed to WANTED ────────────────────────────────────────────────
interface Helpers {
  schedule: GeneratedSchedule
  counts: Map<string, number> // matches per team name
  pairs: Map<string, number> // meetings per pair key (sorted names)
  slotSizes: number[] // matches per time slot, chronological
  pairKey(a: string, b: string): string
  firstSlotHas(a: string, b: string): boolean
  firstSlotIdle(): string[]
  allSlotsFullExceptLast(): boolean
}

function makeHelpers(schedule: GeneratedSchedule, numPitches: number): Helpers {
  const counts = new Map<string, number>()
  const pairs = new Map<string, number>()
  const slots = new Map<number, number>()
  for (const m of schedule.matches) {
    counts.set(m.homeTeam.name, (counts.get(m.homeTeam.name) || 0) + 1)
    counts.set(m.awayTeam.name, (counts.get(m.awayTeam.name) || 0) + 1)
    const key = [m.homeTeam.name, m.awayTeam.name].sort().join('|')
    pairs.set(key, (pairs.get(key) || 0) + 1)
    slots.set(m.startTime.getTime(), (slots.get(m.startTime.getTime()) || 0) + 1)
  }
  const slotTimes = [...slots.keys()].sort((a, b) => a - b)
  const slotSizes = slotTimes.map(t => slots.get(t)!)
  const t0 = slotTimes[0]

  return {
    schedule,
    counts,
    pairs,
    slotSizes,
    pairKey: (a, b) => [a, b].sort().join('|'),
    firstSlotHas: (a, b) =>
      schedule.matches.some(
        m =>
          m.startTime.getTime() === t0 &&
          new Set([m.homeTeam.name, m.awayTeam.name, a, b]).size === 2
      ),
    firstSlotIdle: () =>
      (schedule.byes ?? [])
        .filter(bye => bye.startTime && bye.startTime.getTime() === t0)
        .map(bye => bye.team.name),
    allSlotsFullExceptLast: () => slotSizes.slice(0, -1).every(c => c === numPitches),
  }
}

function* permutations<T>(arr: T[]): Generator<T[]> {
  if (arr.length <= 1) {
    yield arr
    return
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const p of permutations(rest)) yield [arr[i], ...p]
  }
}

const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

let found = false
for (const perm of permutations(TEAM_NAMES)) {
  const teams: Team[] = perm.map((name, i) => ({ id: `t${i}`, name }))
  const byName = new Map(teams.map(t => [t.name, t.id]))
  const config: SchedulingConfig = {
    ...CONFIG,
    excludedMatchups:
      CONFIG.mode === 'limited-matches' && EXCLUDED_NAME_PAIRS.length
        ? EXCLUDED_NAME_PAIRS.map(([a, b]) => [byName.get(a)!, byName.get(b)!])
        : undefined,
  }
  const url = createTournamentShareUrl(SETTINGS, teams, config, 'https://fodbold.kscloud.io/')

  // Always round-trip through the URL parser so the result is EXACTLY what
  // the app will regenerate for this link
  const parsed = parseTournamentShareParams(new URL(url).searchParams)
  if (!parsed.ok) continue
  const s = generateSchedule(parsed.data.settings, parsed.data.teams, parsed.data.schedulingConfig)
  if (s.conflicts.length > 0) continue

  const helpers = makeHelpers(s, parsed.data.settings.numPitches)
  if (!WANTED(helpers)) continue

  console.log('ORDER:', perm.join(', '))
  console.log('URL:', url)
  for (const m of s.matches) {
    console.log(
      `${fmt(m.startTime)}-${fmt(m.endTime)}  Bane ${m.pitch}  ${m.homeTeam.name} vs ${m.awayTeam.name}`
    )
  }
  console.log('Counts:', Object.fromEntries(helpers.counts))
  console.log('Warnings:')
  for (const w of s.warnings) console.log(' -', w)
  found = true
  break
}

if (!found) {
  console.log('No team ordering satisfies WANTED — the wish may be mathematically impossible.')
  console.log('Parity check: sum of per-team match counts must be even (each match uses 2).')
}
