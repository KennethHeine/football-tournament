import type { SchedulingConfig, Team, TournamentSettings } from '@/lib/types'

export interface SharedTournamentData {
  settings: TournamentSettings
  teams: Team[]
  schedulingConfig: SchedulingConfig
}

type ParseResult =
  | {
      ok: true
      data: SharedTournamentData
    }
  | {
      ok: false
      error: string
    }

const SHARE_VERSION = '1'

const isPositiveInteger = (value: number) => Number.isInteger(value) && value > 0

const isValidDateString = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const [, year, month, day] = match.map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

const isValidTimeString = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return false

  const [, hours, minutes] = match.map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

const isValidMatchupIndices = (teamAIndex: number, teamBIndex: number, teamsLength: number) =>
  Number.isInteger(teamAIndex) &&
  Number.isInteger(teamBIndex) &&
  teamAIndex >= 0 &&
  teamBIndex >= 0 &&
  teamAIndex < teamsLength &&
  teamBIndex < teamsLength &&
  teamAIndex !== teamBIndex

const getRequiredString = (params: URLSearchParams, key: string) => {
  const value = params.get(key)?.trim()
  return value ? value : null
}

const getPositiveInteger = (params: URLSearchParams, key: string) => {
  const value = params.get(key)
  if (!value) return null

  const parsed = Number(value)
  return isPositiveInteger(parsed) ? parsed : null
}

const getNonNegativeInteger = (params: URLSearchParams, key: string) => {
  const value = params.get(key)
  if (!value) return null

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

export const createTournamentShareParams = (
  settings: TournamentSettings,
  teams: Team[],
  schedulingConfig: SchedulingConfig
) => {
  const params = new URLSearchParams()
  params.set('share', SHARE_VERSION)
  params.set('name', settings.name)
  params.set('startDate', settings.startDate)
  params.set('startTime', settings.startTime)
  params.set('numPitches', settings.numPitches.toString())
  params.set('matchMode', settings.matchMode)
  params.set('breakBetweenMatches', settings.breakBetweenMatches.toString())
  params.set('mode', schedulingConfig.mode)

  for (const pitchName of settings.pitchNames || []) {
    params.append('pitchName', pitchName)
  }

  if (settings.matchMode === 'full-time' && settings.matchDurationMinutes) {
    params.set('matchDurationMinutes', settings.matchDurationMinutes.toString())
  }

  if (settings.matchMode === 'two-halves') {
    if (settings.halfDurationMinutes) {
      params.set('halfDurationMinutes', settings.halfDurationMinutes.toString())
    }
    if (settings.halftimeBreakMinutes !== undefined) {
      params.set('halftimeBreakMinutes', settings.halftimeBreakMinutes.toString())
    }
  }

  const nonByeTeams = teams.filter(team => team.id !== 'BYE' && team.name.trim())
  for (const team of nonByeTeams) {
    params.append('team', team.name)
  }

  if (schedulingConfig.mode === 'limited-matches') {
    if (schedulingConfig.maxMatchesPerTeam) {
      params.set('maxMatchesPerTeam', schedulingConfig.maxMatchesPerTeam.toString())
    }
    if (schedulingConfig.maxTotalMatches) {
      params.set('maxTotalMatches', schedulingConfig.maxTotalMatches.toString())
    }

    const teamIdToIndex = new Map(nonByeTeams.map((team, index) => [team.id, index]))
    for (const [teamA, teamB] of schedulingConfig.excludedMatchups || []) {
      const teamAIndex = teamIdToIndex.get(teamA) ?? -1
      const teamBIndex = teamIdToIndex.get(teamB) ?? -1
      if (teamAIndex >= 0 && teamBIndex >= 0 && teamAIndex !== teamBIndex) {
        params.append('exclude', `${teamAIndex}-${teamBIndex}`)
      }
    }
  }

  return params
}

export const createTournamentShareUrl = (
  settings: TournamentSettings,
  teams: Team[],
  schedulingConfig: SchedulingConfig,
  currentUrl: string
) => {
  const url = new URL(currentUrl)
  url.search = createTournamentShareParams(settings, teams, schedulingConfig).toString()
  url.hash = ''
  return url.toString()
}

export const parseTournamentShareParams = (params: URLSearchParams): ParseResult => {
  if (params.get('share') !== SHARE_VERSION) {
    return { ok: false, error: 'Ukendt delingslink' }
  }

  const startDate = getRequiredString(params, 'startDate')
  const startTime = getRequiredString(params, 'startTime')
  const numPitches = getPositiveInteger(params, 'numPitches')
  const breakBetweenMatches = getNonNegativeInteger(params, 'breakBetweenMatches')
  const matchMode = params.get('matchMode')
  const schedulingMode = params.get('mode')
  const teamNames = params
    .getAll('team')
    .map(team => team.trim())
    .filter(Boolean)

  const missingSettings = [
    !startDate ? 'startDate' : null,
    !startTime ? 'startTime' : null,
    numPitches === null ? 'numPitches' : null,
    breakBetweenMatches === null ? 'breakBetweenMatches' : null,
  ].filter(Boolean)

  if (missingSettings.length > 0) {
    return {
      ok: false,
      error: `Delingslinket mangler turneringsindstillinger: ${missingSettings.join(', ')}`,
    }
  }

  if (!isValidDateString(startDate) || !isValidTimeString(startTime)) {
    return { ok: false, error: 'Delingslinket har ugyldig dato eller starttid' }
  }

  if (matchMode !== 'full-time' && matchMode !== 'two-halves') {
    return { ok: false, error: 'Delingslinket har ugyldig kampindstilling' }
  }

  if (schedulingMode !== 'round-robin' && schedulingMode !== 'limited-matches') {
    return { ok: false, error: 'Delingslinket har ugyldig planlægningstilstand' }
  }

  if (teamNames.length < 2) {
    return { ok: false, error: 'Delingslinket skal indeholde mindst to hold' }
  }

  const pitchNames = params
    .getAll('pitchName')
    .map(name => name.trim())
    .filter(Boolean)
  const settings: TournamentSettings = {
    name: params.get('name') || '',
    startDate,
    startTime,
    numPitches,
    pitchNames:
      pitchNames.length > 0
        ? Array.from({ length: numPitches }, (_, index) => pitchNames[index] || `Bane ${index + 1}`)
        : Array.from({ length: numPitches }, (_, index) => `Bane ${index + 1}`),
    matchMode,
    breakBetweenMatches,
  }

  if (matchMode === 'full-time') {
    const matchDurationMinutes = getPositiveInteger(params, 'matchDurationMinutes')
    if (!matchDurationMinutes) {
      return { ok: false, error: 'Delingslinket mangler kampvarighed' }
    }
    settings.matchDurationMinutes = matchDurationMinutes
  } else {
    const halfDurationMinutes = getPositiveInteger(params, 'halfDurationMinutes')
    const halftimeBreakMinutes = getNonNegativeInteger(params, 'halftimeBreakMinutes')
    if (!halfDurationMinutes || halftimeBreakMinutes === null) {
      return { ok: false, error: 'Delingslinket mangler halvlegsindstillinger' }
    }
    settings.halfDurationMinutes = halfDurationMinutes
    settings.halftimeBreakMinutes = halftimeBreakMinutes
  }

  const teams = teamNames.map((name, index) => ({
    id: `shared-team-${index + 1}`,
    name,
  }))

  const schedulingConfig: SchedulingConfig = {
    mode: schedulingMode,
  }

  if (schedulingMode === 'limited-matches') {
    const maxMatchesPerTeam = getPositiveInteger(params, 'maxMatchesPerTeam')
    if (!maxMatchesPerTeam) {
      return { ok: false, error: 'Delingslinket mangler maks kampe pr. hold' }
    }

    const maxTotalMatches = getPositiveInteger(params, 'maxTotalMatches')
    const excludedMatchups: [string, string][] = []

    for (const excludedMatchup of params.getAll('exclude')) {
      const [teamAIndex, teamBIndex] = excludedMatchup.split('-').map(Number)
      if (isValidMatchupIndices(teamAIndex, teamBIndex, teams.length)) {
        excludedMatchups.push([teams[teamAIndex].id, teams[teamBIndex].id])
      }
    }

    schedulingConfig.maxMatchesPerTeam = maxMatchesPerTeam
    schedulingConfig.maxTotalMatches = maxTotalMatches || undefined
    schedulingConfig.excludedMatchups = excludedMatchups.length > 0 ? excludedMatchups : undefined
  }

  return {
    ok: true,
    data: {
      settings,
      teams,
      schedulingConfig,
    },
  }
}
