import type { Team, Match, TournamentSettings, SchedulingConfig, GeneratedSchedule, ScheduleConflict } from './types'

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

  const workingTeams = [...teams]
  
  if (config.mode === 'round-robin' && teams.length % 2 !== 0) {
    workingTeams.push(BYE_TEAM)
    warnings.push('Odd number of teams: BYE team added for round-robin pairing')
  }

  if (config.mode === 'round-robin') {
    matches = generateRoundRobinMatches(workingTeams, settings)
  } else {
    const result = generateLimitedMatches(workingTeams, settings, config, warnings)
    matches = result.matches
    warnings.push(...result.warnings)
  }

  const conflicts = detectConflicts(matches)
  
  if (conflicts.length > 0) {
    warnings.push(`${conflicts.length} scheduling conflict(s) detected - same team playing multiple matches simultaneously`)
  }

  if (matches.length > 100) {
    warnings.push(`Large tournament: ${matches.length} matches scheduled. Consider breaking into phases.`)
  }

  return { matches, conflicts, warnings }
}

function generateRoundRobinMatches(teams: Team[], settings: TournamentSettings): Match[] {
  const matches: Match[] = []
  const n = teams.length
  
  if (n < 2) return matches

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
      
      if (homeTeam.id !== 'BYE' && awayTeam.id !== 'BYE') {
        matches.push({
          id: `match-${matches.length}`,
          homeTeam,
          awayTeam,
          startTime: new Date(),
          endTime: new Date(),
          pitch: 0
        })
      }
    }
    
    const last = teamIndexes.pop()!
    teamIndexes.splice(1, 0, last)
  }

  return assignTimeSlots(matches, settings)
}

function generateLimitedMatches(
  teams: Team[],
  settings: TournamentSettings,
  config: SchedulingConfig,
  warnings: string[]
): { matches: Match[], warnings: string[] } {
  const matches: Match[] = []
  const teamMatchCounts = new Map<string, number>()
  const pairings = new Set<string>()
  
  teams.forEach(team => teamMatchCounts.set(team.id, 0))
  
  const maxPerTeam = config.maxMatchesPerTeam || 3
  const maxTotal = config.maxTotalMatches || Infinity
  
  const maxPossibleMatches = teams.length * maxPerTeam / 2
  const targetMatches = Math.min(maxTotal, maxPossibleMatches)
  
  const maxUniqueOpponents = teams.length - 1
  if (maxPerTeam > maxUniqueOpponents) {
    warnings.push(`Max matches per team (${maxPerTeam}) exceeds unique opponents (${maxUniqueOpponents}). Duplicate matchups will occur.`)
  }
  
  let attempts = 0
  const maxAttempts = targetMatches * 10
  
  while (matches.length < targetMatches && attempts < maxAttempts) {
    attempts++
    
    const availableTeams = teams.filter(team => 
      (teamMatchCounts.get(team.id) || 0) < maxPerTeam
    )
    
    if (availableTeams.length < 2) break
    
    availableTeams.sort((a, b) => {
      const countA = teamMatchCounts.get(a.id) || 0
      const countB = teamMatchCounts.get(b.id) || 0
      return countA - countB
    })
    
    let homeTeam: Team | null = null
    let awayTeam: Team | null = null
    
    for (let i = 0; i < availableTeams.length - 1; i++) {
      for (let j = i + 1; j < availableTeams.length; j++) {
        const t1 = availableTeams[i]
        const t2 = availableTeams[j]
        const pairKey = [t1.id, t2.id].sort().join('-')
        
        if (!pairings.has(pairKey)) {
          homeTeam = t1
          awayTeam = t2
          pairings.add(pairKey)
          break
        }
      }
      if (homeTeam && awayTeam) break
    }
    
    if (!homeTeam || !awayTeam) {
      const t1 = availableTeams[0]
      const t2 = availableTeams[1]
      homeTeam = t1
      awayTeam = t2
    }
    
    matches.push({
      id: `match-${matches.length}`,
      homeTeam,
      awayTeam,
      startTime: new Date(),
      endTime: new Date(),
      pitch: 0
    })
    
    teamMatchCounts.set(homeTeam.id, (teamMatchCounts.get(homeTeam.id) || 0) + 1)
    teamMatchCounts.set(awayTeam.id, (teamMatchCounts.get(awayTeam.id) || 0) + 1)
  }
  
  return { matches: assignTimeSlots(matches, settings), warnings }
}

function assignTimeSlots(matches: Match[], settings: TournamentSettings): Match[] {
  const matchDuration = calculateMatchDuration(settings)
  
  const startDateTime = new Date(`${settings.startDate}T${settings.startTime}`)
  
  // Bug fix: Validate that the constructed date is valid
  if (isNaN(startDateTime.getTime())) {
    throw new Error(`Invalid tournament start date/time: ${settings.startDate} ${settings.startTime}`)
  }
  
  const pitchSchedules: Match[][] = Array.from({ length: settings.numPitches }, () => [])
  const teamLastEndTime = new Map<string, Date>()
  const pitchNextAvailable: Date[] = Array.from({ length: settings.numPitches }, () => new Date(startDateTime))
  
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
      const possibleStartTime = new Date(Math.max(earliestPossibleStart.getTime(), pitchAvailableAt.getTime()))
      
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
      pitchNextAvailable[bestPitch] = new Date(match.endTime.getTime() + settings.breakBetweenMatches * 60000)
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
          const team = matchesAtTime[0].homeTeam.id === teamId 
            ? matchesAtTime[0].homeTeam 
            : matchesAtTime[0].awayTeam
          
          conflicts.push({
            team,
            matches: matchesAtTime
          })
          processedConflicts.add(conflictKey)
        }
      }
    }
  }
  
  return conflicts
}

export function exportToCSV(matches: Match[], settings: TournamentSettings): string {
  const headers = ['Time', 'Pitch', 'Home Team', 'Away Team', 'End Time']
  const rows = matches.map(m => [
    escapeCsvField(formatTime(m.startTime)),
    escapeCsvField(getPitchName(m.pitch, settings)),
    escapeCsvField(m.homeTeam.name),
    escapeCsvField(m.awayTeam.name),
    escapeCsvField(formatTime(m.endTime))
  ])
  
  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

export function exportToText(matches: Match[], settings: TournamentSettings): string {
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
  
  for (const [time, matchesAtTime] of matchesByTime) {
    text += `${time}\n`
    matchesAtTime.forEach(match => {
      text += `  ${getPitchName(match.pitch, settings)}: ${match.homeTeam.name} vs ${match.awayTeam.name}\n`
    })
    text += '\n'
  }
  
  return text
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
