import { describe, expect, it } from 'vitest'
import {
  createTournamentShareParams,
  createTournamentShareUrl,
  parseTournamentShareParams,
} from '../lib/share-url'
import type { SchedulingConfig, Team, TournamentSettings } from '../lib/types'

describe('share-url', () => {
  const settings: TournamentSettings = {
    name: 'Sommer Cup',
    startDate: '2026-06-15',
    startTime: '10:30',
    numPitches: 2,
    pitchNames: ['Kunst A', 'Græs B'],
    matchMode: 'full-time',
    matchDurationMinutes: 18,
    breakBetweenMatches: 4,
  }

  const teams: Team[] = [
    { id: 'team-a', name: 'Team A' },
    { id: 'team-b', name: 'Team B' },
    { id: 'team-c', name: 'Team C' },
  ]

  it('round-trips input data without including a generated schedule', () => {
    const config: SchedulingConfig = { mode: 'round-robin' }
    const params = createTournamentShareParams(settings, teams, config)
    const parsed = parseTournamentShareParams(params)

    expect(params.has('schedule')).toBe(false)
    expect(params.has('matches')).toBe(false)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data.settings).toEqual(settings)
    expect(parsed.data.teams.map(team => team.name)).toEqual(['Team A', 'Team B', 'Team C'])
    expect(parsed.data.schedulingConfig).toEqual(config)
  })

  it('round-trips limited match settings and excluded matchups by team index', () => {
    const config: SchedulingConfig = {
      mode: 'limited-matches',
      maxMatchesPerTeam: 2,
      maxTotalMatches: 4,
      excludedMatchups: [['team-a', 'team-c']],
    }
    const params = createTournamentShareParams(settings, teams, config)
    const parsed = parseTournamentShareParams(params)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data.schedulingConfig.mode).toBe('limited-matches')
    expect(parsed.data.schedulingConfig.maxMatchesPerTeam).toBe(2)
    expect(parsed.data.schedulingConfig.maxTotalMatches).toBe(4)
    expect(parsed.data.schedulingConfig.excludedMatchups).toEqual([
      ['shared-team-1', 'shared-team-3'],
    ])
  })

  it('round-trips two-halves settings with zero-minute breaks', () => {
    const twoHalvesSettings: TournamentSettings = {
      ...settings,
      matchMode: 'two-halves',
      matchDurationMinutes: undefined,
      halfDurationMinutes: 12,
      halftimeBreakMinutes: 0,
      breakBetweenMatches: 0,
    }
    const params = createTournamentShareParams(twoHalvesSettings, teams, { mode: 'round-robin' })
    const parsed = parseTournamentShareParams(params)

    expect(params.get('halftimeBreakMinutes')).toBe('0')
    expect(params.get('breakBetweenMatches')).toBe('0')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.data.settings).toEqual(twoHalvesSettings)
  })

  it('rejects invalid or incomplete share links', () => {
    expect(parseTournamentShareParams(new URLSearchParams('share=1')).ok).toBe(false)
    expect(
      parseTournamentShareParams(
        new URLSearchParams(
          'share=1&startDate=2026-06-15&startTime=10:30&numPitches=2&breakBetweenMatches=5&matchMode=full-time&matchDurationMinutes=20&mode=round-robin&team=Team+A'
        )
      ).ok
    ).toBe(false)
    expect(
      parseTournamentShareParams(
        new URLSearchParams(
          'share=1&startDate=2026-13-45&startTime=99:99&numPitches=2&breakBetweenMatches=5&matchMode=full-time&matchDurationMinutes=20&mode=round-robin&team=Team+A&team=Team+B'
        )
      ).ok
    ).toBe(false)
  })

  it('creates a share URL on the current path', () => {
    const url = createTournamentShareUrl(
      settings,
      teams,
      { mode: 'round-robin' },
      'https://example.com/app/?tournament=local-id&step=4'
    )

    expect(url).toContain('https://example.com/app/?share=1')
    expect(url).not.toContain('tournament=local-id')
    expect(url).not.toContain('step=4')
  })
})
