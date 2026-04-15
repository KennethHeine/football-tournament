import type {
  Team,
  Match,
  TournamentSettings,
  SchedulingConfig,
  GeneratedSchedule,
  ScheduleConflict,
  ByeInfo,
} from './types'

const BYE_TEAM: Team = { id: 'BYE', name: 'BYE' }

/**
 * Escapes HTML entities in a string to prevent XSS attacks.
 * Used when generating HTML strings for image export.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Escapes CSV field to prevent formula injection and handle special characters.
 * Prefixes with apostrophe if starts with =, +, -, @ (formula characters).
 * Properly quotes and escapes fields containing commas, quotes, or newlines.
 */
export function escapeCsvField(field: string): string {
  // First, check if quoting is needed
  const needsQuoting = field.includes(',') || field.includes('"') || field.includes('\n')

  // Check for formula injection characters
  const isFormulaChar = /^[=+\-@]/.test(field)

  if (needsQuoting) {
    // Escape quotes first, then wrap in quotes
    const escaped = field.replace(/"/g, '""')
    // If it starts with a formula character, add apostrophe prefix inside quotes
    if (isFormulaChar) {
      return `"'${escaped}"`
    }
    return `"${escaped}"`
  }

  // No quoting needed - just prefix formula characters with apostrophe
  if (isFormulaChar) {
    return `'${field}`
  }

  return field
}

export function getPitchName(pitchNumber: number, settings: TournamentSettings): string {
  if (settings.pitchNames && settings.pitchNames[pitchNumber - 1]) {
    return settings.pitchNames[pitchNumber - 1]
  }
  return `Bane ${pitchNumber}`
}

export function generateSchedule(
  settings: TournamentSettings,
  teams: Team[],
  config: SchedulingConfig
): GeneratedSchedule {
  const warnings: string[] = []
  let matches: Match[] = []
  let byes: ByeInfo[] = []

  const workingTeams = [...teams]

  if (config.mode === 'round-robin' && teams.length % 2 !== 0) {
    workingTeams.push(BYE_TEAM)
    warnings.push('Ulige antal hold: Et hold sidder over i hver runde')
  }

  if (config.mode === 'round-robin') {
    const result = generateRoundRobinMatches(workingTeams, settings)
    matches = result.matches
    byes = result.byes
  } else {
    const result = generateLimitedMatches(workingTeams, settings, config, warnings)
    matches = result.matches
    byes = result.byes
    warnings.push(...result.warnings)
  }

  const conflicts = detectConflicts(matches)

  if (conflicts.length > 0) {
    warnings.push(
      `${conflicts.length} scheduling conflict(s) detected - same team playing multiple matches simultaneously`
    )
  }

  if (matches.length > 100) {
    warnings.push(
      `Large tournament: ${matches.length} matches scheduled. Consider breaking into phases.`
    )
  }

  // Check for consecutive byes
  if (byes.length > 1) {
    const byesByTeam = new Map<string, number[]>()
    for (const bye of byes) {
      if (!byesByTeam.has(bye.team.id)) {
        byesByTeam.set(bye.team.id, [])
      }
      byesByTeam.get(bye.team.id)!.push(bye.round)
    }
    let hasConsecutiveByes = false
    for (const [, rounds] of byesByTeam) {
      rounds.sort((a, b) => a - b)
      for (let i = 1; i < rounds.length; i++) {
        if (rounds[i] - rounds[i - 1] === 1) {
          warnings.push('Advarsel: Et hold sidder over to runder i træk')
          hasConsecutiveByes = true
          break
        }
      }
      if (hasConsecutiveByes) break
    }
  }

  return { matches, conflicts, warnings, byes }
}

function generateRoundRobinMatches(
  teams: Team[],
  settings: TournamentSettings
): { matches: Match[]; byes: ByeInfo[] } {
  const matches: Match[] = []
  const byes: ByeInfo[] = []
  const n = teams.length

  if (n < 2) return { matches, byes }

  const rounds = n - 1
  const matchesPerRound = n / 2

  const teamIndexes = teams.map((_, i) => i)

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      let home: number, away: number

      if (match === 0) {
        home = teamIndexes[0]
        away = teamIndexes[n - 1]
      } else {
        home = teamIndexes[match]
        away = teamIndexes[n - 1 - match]
      }

      const homeTeam = teams[home]
      const awayTeam = teams[away]

      if (homeTeam.id === 'BYE' || awayTeam.id === 'BYE') {
        const byeTeam = homeTeam.id === 'BYE' ? awayTeam : homeTeam
        byes.push({ team: byeTeam, round })
      } else {
        matches.push({
          id: `match-${matches.length}`,
          homeTeam,
          awayTeam,
          startTime: new Date(),
          endTime: new Date(),
          pitch: 0,
          round,
        })
      }
    }

    const last = teamIndexes.pop()!
    teamIndexes.splice(1, 0, last)
  }

  const assignedMatches = assignTimeSlots(matches, settings)

  // Assign start times to byes based on their round's matches
  for (const bye of byes) {
    const roundMatch = assignedMatches.find(m => m.round === bye.round)
    if (roundMatch) {
      bye.startTime = roundMatch.startTime
    }
  }

  return { matches: assignedMatches, byes }
}

interface RoundCandidate {
  home: Team
  away: Team
}

function generateLimitedMatches(
  teams: Team[],
  settings: TournamentSettings,
  config: SchedulingConfig,
  warnings: string[]
): { matches: Match[]; byes: ByeInfo[]; warnings: string[] } {
  const maxPerTeam = config.maxMatchesPerTeam || 3
  const maxTotal = config.maxTotalMatches || Infinity

  const excludedPairings = new Set(
    (config.excludedMatchups || []).map(([a, b]) => [a, b].sort().join('-'))
  )

  const maxUniqueOpponents = teams.length - 1
  if (maxPerTeam > maxUniqueOpponents) {
    warnings.push(
      `Max matches per team (${maxPerTeam}) exceeds unique opponents (${maxUniqueOpponents}). Duplicate matchups will occur.`
    )
  }

  // Use round-robin circle method to generate balanced candidate pairings
  // This guarantees no duplicates and natural balance across rounds
  const n = teams.length
  const isEven = n % 2 === 0
  const workingTeams = isEven ? [...teams] : [...teams, BYE_TEAM]
  const N = workingTeams.length

  interface CandidateMatch extends RoundCandidate {
    rrRound: number
    selected: boolean
  }

  const candidates: CandidateMatch[] = []
  const teamIndexes = workingTeams.map((_, i) => i)

  for (let round = 0; round < N - 1; round++) {
    for (let match = 0; match < N / 2; match++) {
      const homeIdx = match === 0 ? teamIndexes[0] : teamIndexes[match]
      const awayIdx = match === 0 ? teamIndexes[N - 1] : teamIndexes[N - 1 - match]
      const homeTeam = workingTeams[homeIdx]
      const awayTeam = workingTeams[awayIdx]

      // Skip BYE matches and excluded matchups
      if (homeTeam.id === 'BYE' || awayTeam.id === 'BYE') continue
      const key = [homeTeam.id, awayTeam.id].sort().join('-')
      if (excludedPairings.has(key)) continue

      candidates.push({ home: homeTeam, away: awayTeam, rrRound: round, selected: false })
    }

    const last = teamIndexes.pop()!
    teamIndexes.splice(1, 0, last)
  }

  // Constraint-aware greedy selection: prioritize matches for teams with fewer
  // remaining candidates relative to their remaining needed matches.
  // This ensures teams affected by excluded matchups still reach maxPerTeam.
  const teamCounts = new Map(teams.map(t => [t.id, 0]))
  const selectedMatches: CandidateMatch[] = []

  let madeProgress = true
  while (madeProgress && selectedMatches.length < maxTotal) {
    madeProgress = false

    // Single pass: compute remaining candidates and find best match simultaneously
    const remainingCandidates = new Map(teams.map(t => [t.id, 0]))
    const eligibleCandidates: CandidateMatch[] = []

    for (const c of candidates) {
      if (c.selected) continue
      const hc = teamCounts.get(c.home.id) || 0
      const ac = teamCounts.get(c.away.id) || 0
      if (hc >= maxPerTeam || ac >= maxPerTeam) continue
      remainingCandidates.set(c.home.id, (remainingCandidates.get(c.home.id) || 0) + 1)
      remainingCandidates.set(c.away.id, (remainingCandidates.get(c.away.id) || 0) + 1)
      eligibleCandidates.push(c)
    }

    // Find best match: prioritize constrained teams (low slack = remaining - needed)
    let bestMatch: CandidateMatch | null = null
    let bestPriority = -Infinity

    for (const c of eligibleCandidates) {
      const homeCount = teamCounts.get(c.home.id) || 0
      const awayCount = teamCounts.get(c.away.id) || 0
      const homeNeeded = maxPerTeam - homeCount
      const awayNeeded = maxPerTeam - awayCount
      const homeRemaining = remainingCandidates.get(c.home.id) || 0
      const awayRemaining = remainingCandidates.get(c.away.id) || 0
      const homeSlack = homeRemaining - homeNeeded
      const awaySlack = awayRemaining - awayNeeded
      const minSlack = Math.min(homeSlack, awaySlack)

      // Slack weight (1000) ensures constrained teams (slack≈0) are prioritized over
      // balance-based tiebreaking. The count tiebreaker is always < 2*maxPerTeam.
      const priority = -minSlack * 1000 + (maxPerTeam * 2 - homeCount - awayCount)

      if (
        priority > bestPriority ||
        (priority === bestPriority && c.rrRound < (bestMatch?.rrRound ?? Infinity))
      ) {
        bestPriority = priority
        bestMatch = c
      }
    }

    if (bestMatch) {
      bestMatch.selected = true
      selectedMatches.push(bestMatch)
      teamCounts.set(bestMatch.home.id, (teamCounts.get(bestMatch.home.id) || 0) + 1)
      teamCounts.set(bestMatch.away.id, (teamCounts.get(bestMatch.away.id) || 0) + 1)
      madeProgress = true
    }
  }

  // If some teams are still under maxPerTeam, add rematch candidates
  const underScheduled = teams.filter(t => (teamCounts.get(t.id) || 0) < maxPerTeam)
  if (underScheduled.length > 0 && selectedMatches.length < maxTotal) {
    const existingPairs = new Set(selectedMatches.map(m => [m.home.id, m.away.id].sort().join('-')))
    const rematchCandidates: CandidateMatch[] = []
    for (let a = 0; a < teams.length; a++) {
      for (let b = a + 1; b < teams.length; b++) {
        const key = [teams[a].id, teams[b].id].sort().join('-')
        if (excludedPairings.has(key)) continue
        if (!existingPairs.has(key)) continue // only rematch existing pairings
        const aC = teamCounts.get(teams[a].id) || 0
        const bC = teamCounts.get(teams[b].id) || 0
        if (aC >= maxPerTeam && bC >= maxPerTeam) continue
        rematchCandidates.push({
          home: teams[a],
          away: teams[b],
          rrRound: N,
          selected: false,
        })
      }
    }

    // Greedy select rematches to fill remaining slots
    let rematchProgress = true
    while (rematchProgress && selectedMatches.length < maxTotal) {
      rematchProgress = false
      let bestRematch: CandidateMatch | null = null
      let bestScore = Infinity

      for (const c of rematchCandidates) {
        if (c.selected) continue
        const homeCount = teamCounts.get(c.home.id) || 0
        const awayCount = teamCounts.get(c.away.id) || 0
        if (homeCount >= maxPerTeam || awayCount >= maxPerTeam) continue

        const score = homeCount + awayCount
        if (score < bestScore) {
          bestScore = score
          bestRematch = c
        }
      }

      if (bestRematch) {
        bestRematch.selected = true
        selectedMatches.push(bestRematch)
        teamCounts.set(bestRematch.home.id, (teamCounts.get(bestRematch.home.id) || 0) + 1)
        teamCounts.set(bestRematch.away.id, (teamCounts.get(bestRematch.away.id) || 0) + 1)
        rematchProgress = true
      }
    }

    if (selectedMatches.length > 0) {
      const hasRematches = rematchCandidates.some(c => c.selected)
      if (hasRematches) {
        warnings.push(
          'Udelukkede holdpar kræver genkampe for at sikre alle hold spiller lige mange kampe'
        )
      }
    }
  }

  // Organize selected matches into time slots
  // Each slot has at most numPitches matches with no team playing twice
  selectedMatches.sort((a, b) => a.rrRound - b.rrRound)

  const timeSlotGroups: CandidateMatch[][] = []
  const remaining = [...selectedMatches]

  while (remaining.length > 0) {
    const slotTeams = new Set<string>()
    const slotMatches: CandidateMatch[] = []
    const skipped: CandidateMatch[] = []

    for (const c of remaining) {
      if (
        slotMatches.length >= settings.numPitches ||
        slotTeams.has(c.home.id) ||
        slotTeams.has(c.away.id)
      ) {
        skipped.push(c)
      } else {
        slotTeams.add(c.home.id)
        slotTeams.add(c.away.id)
        slotMatches.push(c)
      }
    }

    if (slotMatches.length === 0) break
    timeSlotGroups.push(slotMatches)
    remaining.length = 0
    remaining.push(...skipped)
  }

  // Reorder time slots to minimize consecutive byes
  const orderedSlots = reorderRoundsToMinimizeConsecutiveByes(timeSlotGroups, teams)

  const matches: Match[] = []
  for (let r = 0; r < orderedSlots.length; r++) {
    for (const c of orderedSlots[r]) {
      matches.push({
        id: `match-${matches.length}`,
        homeTeam: c.home,
        awayTeam: c.away,
        startTime: new Date(),
        endTime: new Date(),
        pitch: 0,
        round: r,
      })
    }
  }

  if (excludedPairings.size > 0) {
    warnings.push(`${excludedPairings.size} holdpar er udelukket fra at spille mod hinanden`)
  }

  const assignedMatches = assignTimeSlots(matches, settings)

  // Compute idle teams per time slot (after time assignment)
  const byes = computeIdleTeams(assignedMatches, teams)

  return { matches: assignedMatches, byes, warnings }
}

/**
 * Reorders scheduling rounds to minimize consecutive byes.
 * Uses backtracking to find an ordering where no team sits out
 * two consecutive time slots. Falls back to greedy if no perfect
 * ordering exists.
 */
function reorderRoundsToMinimizeConsecutiveByes(
  roundGroups: RoundCandidate[][],
  teams: Team[]
): RoundCandidate[][] {
  if (roundGroups.length <= 1) return roundGroups

  // Precompute idle teams per round
  const idleSets: Set<string>[] = roundGroups.map(round => {
    const playing = new Set<string>()
    for (const m of round) {
      playing.add(m.home.id)
      playing.add(m.away.id)
    }
    const idle = new Set<string>()
    for (const t of teams) {
      if (!playing.has(t.id)) idle.add(t.id)
    }
    return idle
  })

  function hasOverlap(set1: Set<string>, set2: Set<string>): boolean {
    for (const id of set2) {
      if (set1.has(id)) return true
    }
    return false
  }

  // Backtracking: find an ordering with no consecutive byes
  function backtrack(ordering: number[], used: Set<number>): number[] | null {
    if (ordering.length === roundGroups.length) return [...ordering]

    const prevIdle = ordering.length > 0 ? idleSets[ordering[ordering.length - 1]] : null

    for (let i = 0; i < roundGroups.length; i++) {
      if (used.has(i)) continue
      if (prevIdle && hasOverlap(prevIdle, idleSets[i])) continue

      ordering.push(i)
      used.add(i)
      const result = backtrack(ordering, used)
      if (result) return result
      ordering.pop()
      used.delete(i)
    }
    return null
  }

  const result = backtrack([], new Set())
  if (result) {
    return result.map(i => roundGroups[i])
  }

  // Fallback: greedy ordering (minimize consecutive byes when perfect ordering impossible)
  function consecutiveByeCount(idle1: Set<string>, idle2: Set<string>): number {
    let count = 0
    for (const id of idle2) {
      if (idle1.has(id)) count++
    }
    return count
  }

  const available = roundGroups.map((r, i) => i)
  const ordered: number[] = [available.shift()!]

  while (available.length > 0) {
    const prevIdle = idleSets[ordered[ordered.length - 1]]
    let bestIdx = 0
    let bestConsecutive = Infinity

    for (let i = 0; i < available.length; i++) {
      const consecutive = consecutiveByeCount(prevIdle, idleSets[available[i]])
      if (consecutive < bestConsecutive) {
        bestConsecutive = consecutive
        bestIdx = i
      }
    }

    ordered.push(available[bestIdx])
    available.splice(bestIdx, 1)
  }

  return ordered.map(i => roundGroups[i])
}

function computeIdleTeams(matches: Match[], teams: Team[]): ByeInfo[] {
  const byes: ByeInfo[] = []

  // Group matches by start time
  const matchesByTime = new Map<string, Match[]>()
  for (const match of matches) {
    const key = match.startTime.toISOString()
    if (!matchesByTime.has(key)) {
      matchesByTime.set(key, [])
    }
    matchesByTime.get(key)!.push(match)
  }

  // Sort time slots chronologically
  const timeSlots = Array.from(matchesByTime.entries()).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  )

  // For each time slot, find teams not playing
  for (let round = 0; round < timeSlots.length; round++) {
    const [, slotMatches] = timeSlots[round]
    const playingTeams = new Set<string>()
    for (const match of slotMatches) {
      playingTeams.add(match.homeTeam.id)
      playingTeams.add(match.awayTeam.id)
    }

    for (const team of teams) {
      if (!playingTeams.has(team.id)) {
        byes.push({
          team,
          round,
          startTime: slotMatches[0].startTime,
        })
      }
    }
  }

  return byes
}

function assignTimeSlots(matches: Match[], settings: TournamentSettings): Match[] {
  const matchDuration = calculateMatchDuration(settings)

  const startDateTime = new Date(`${settings.startDate}T${settings.startTime}`)

  // Bug fix: Validate that the constructed date is valid
  if (isNaN(startDateTime.getTime())) {
    throw new Error(
      `Invalid tournament start date/time: ${settings.startDate} ${settings.startTime}`
    )
  }

  const pitchSchedules: Match[][] = Array.from({ length: settings.numPitches }, () => [])
  const teamLastEndTime = new Map<string, Date>()
  const pitchNextAvailable: Date[] = Array.from(
    { length: settings.numPitches },
    () => new Date(startDateTime)
  )

  for (const match of matches) {
    let bestPitch = -1
    let bestStartTime: Date | null = null
    let earliestPossibleStart = new Date(startDateTime)

    const homeLastEnd = teamLastEndTime.get(match.homeTeam.id)
    const awayLastEnd = teamLastEndTime.get(match.awayTeam.id)

    if (homeLastEnd && homeLastEnd > earliestPossibleStart) {
      earliestPossibleStart = new Date(homeLastEnd)
    }
    if (awayLastEnd && awayLastEnd > earliestPossibleStart) {
      earliestPossibleStart = new Date(awayLastEnd)
    }

    for (let pitch = 0; pitch < settings.numPitches; pitch++) {
      const pitchAvailableAt = pitchNextAvailable[pitch]
      const possibleStartTime = new Date(
        Math.max(earliestPossibleStart.getTime(), pitchAvailableAt.getTime())
      )

      if (bestStartTime === null || possibleStartTime < bestStartTime) {
        bestStartTime = possibleStartTime
        bestPitch = pitch
      }
    }

    if (bestPitch >= 0 && bestStartTime) {
      match.pitch = bestPitch + 1
      match.startTime = new Date(bestStartTime)
      match.endTime = new Date(bestStartTime.getTime() + matchDuration * 60000)

      pitchSchedules[bestPitch].push(match)
      pitchNextAvailable[bestPitch] = new Date(
        match.endTime.getTime() + settings.breakBetweenMatches * 60000
      )
      teamLastEndTime.set(match.homeTeam.id, match.endTime)
      teamLastEndTime.set(match.awayTeam.id, match.endTime)
    }
  }

  return matches.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
}

function calculateMatchDuration(settings: TournamentSettings): number {
  if (settings.matchMode === 'full-time') {
    return settings.matchDurationMinutes || 30
  } else {
    const halfDuration = settings.halfDurationMinutes || 15
    const halftime = settings.halftimeBreakMinutes || 5
    return 2 * halfDuration + halftime
  }
}

function detectConflicts(matches: Match[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = []
  const teamMatchesByTime = new Map<string, Map<string, Match[]>>()

  for (const match of matches) {
    const timeKey = match.startTime.toISOString()

    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!teamMatchesByTime.has(team.id)) {
        teamMatchesByTime.set(team.id, new Map())
      }
      const teamTimes = teamMatchesByTime.get(team.id)!
      if (!teamTimes.has(timeKey)) {
        teamTimes.set(timeKey, [])
      }
      teamTimes.get(timeKey)!.push(match)
    }
  }

  const processedConflicts = new Set<string>()

  for (const [teamId, timeMap] of teamMatchesByTime) {
    for (const [timeKey, matchesAtTime] of timeMap) {
      if (matchesAtTime.length > 1) {
        const conflictKey = `${teamId}-${timeKey}`
        if (!processedConflicts.has(conflictKey)) {
          const team =
            matchesAtTime[0].homeTeam.id === teamId
              ? matchesAtTime[0].homeTeam
              : matchesAtTime[0].awayTeam

          conflicts.push({
            team,
            matches: matchesAtTime,
          })
          processedConflicts.add(conflictKey)
        }
      }
    }
  }

  return conflicts
}

export function exportToCSV(matches: Match[], settings: TournamentSettings): string {
  const headers = ['Time', 'Pitch', 'Home Team', 'Away Team', 'End Time'].map(escapeCsvField)
  const rows = matches.map(m => [
    escapeCsvField(formatTime(m.startTime)),
    escapeCsvField(getPitchName(m.pitch, settings)),
    escapeCsvField(m.homeTeam.name),
    escapeCsvField(m.awayTeam.name),
    escapeCsvField(formatTime(m.endTime)),
  ])

  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

export function exportToText(
  matches: Match[],
  settings: TournamentSettings,
  byes: ByeInfo[] = []
): string {
  let text = 'FOOTBALL TOURNAMENT SCHEDULE\n'
  text += '='.repeat(60) + '\n\n'

  const matchesByTime = new Map<string, Match[]>()

  matches.forEach(match => {
    const timeKey = formatTime(match.startTime)
    if (!matchesByTime.has(timeKey)) {
      matchesByTime.set(timeKey, [])
    }
    matchesByTime.get(timeKey)!.push(match)
  })

  // Build a map from time key to bye team names
  const byesByTimeKey = new Map<string, string[]>()
  for (const bye of byes) {
    if (bye.startTime) {
      const key = formatTime(new Date(bye.startTime))
      if (!byesByTimeKey.has(key)) {
        byesByTimeKey.set(key, [])
      }
      byesByTimeKey.get(key)!.push(bye.team.name)
    }
  }

  for (const [time, matchesAtTime] of matchesByTime) {
    text += `${time}\n`
    matchesAtTime.forEach(match => {
      text += `  ${getPitchName(match.pitch, settings)}: ${match.homeTeam.name} vs ${match.awayTeam.name}\n`
    })
    const byeTeamNames = byesByTimeKey.get(time)
    if (byeTeamNames && byeTeamNames.length > 0) {
      text += `  Oversidder: ${byeTeamNames.join(', ')}\n`
    }
    text += '\n'
  }

  return text
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
