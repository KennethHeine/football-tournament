export type MatchMode = 'full-time' | 'two-halves'

export type SchedulingMode = 'round-robin' | 'limited-matches'

export interface TournamentSettings {
  name: string
  startDate: string
  startTime: string
  numPitches: number
  matchMode: MatchMode
  matchDurationMinutes?: number
  halfDurationMinutes?: number
  halftimeBreakMinutes?: number
  breakBetweenMatches: number
}

export interface Team {
  id: string
  name: string
}

export interface SchedulingConfig {
  mode: SchedulingMode
  maxMatchesPerTeam?: number
  maxTotalMatches?: number
}

export interface Match {
  id: string
  homeTeam: Team
  awayTeam: Team
  startTime: Date
  endTime: Date
  pitch: number
}

export interface ScheduleConflict {
  team: Team
  matches: Match[]
}

export interface GeneratedSchedule {
  matches: Match[]
  conflicts: ScheduleConflict[]
  warnings: string[]
}

export interface Tournament {
  id: string
  settings: TournamentSettings
  teams: Team[]
  schedulingConfig: SchedulingConfig
  schedule?: GeneratedSchedule
  createdAt: string
  updatedAt: string
  ownerId?: string
}
