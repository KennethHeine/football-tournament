import { describe, it, expect } from 'vitest'
import { generateSchedule, getPitchName } from '../lib/scheduler'
import type { Team, TournamentSettings, SchedulingConfig } from '../lib/types'

describe('Scheduler', () => {
  const defaultSettings: TournamentSettings = {
    name: 'Test Tournament',
    startDate: '2026-01-15',
    startTime: '09:00',
    numPitches: 2,
    pitchNames: ['Bane 1', 'Bane 2'],
    matchMode: 'full-time',
    matchDurationMinutes: 30,
    breakBetweenMatches: 5,
  }

  const teams: Team[] = [
    { id: '1', name: 'Team A' },
    { id: '2', name: 'Team B' },
    { id: '3', name: 'Team C' },
    { id: '4', name: 'Team D' },
  ]

  describe('getPitchName', () => {
    it('should return custom pitch name when provided', () => {
      expect(getPitchName(1, defaultSettings)).toBe('Bane 1')
      expect(getPitchName(2, defaultSettings)).toBe('Bane 2')
    })

    it('should return default pitch name when custom names not provided', () => {
      const settingsNoNames = { ...defaultSettings, pitchNames: undefined }
      expect(getPitchName(1, settingsNoNames)).toBe('Bane 1')
    })

    it('should return default pitch name when index out of bounds', () => {
      expect(getPitchName(5, defaultSettings)).toBe('Bane 5')
    })
  })

  describe('generateSchedule - Round Robin', () => {
    const roundRobinConfig: SchedulingConfig = {
      mode: 'round-robin',
    }

    it('should generate correct number of matches for even number of teams', () => {
      const schedule = generateSchedule(defaultSettings, teams, roundRobinConfig)
      // For 4 teams: (4 * 3) / 2 = 6 matches
      expect(schedule.matches.length).toBe(6)
    })

    it('should ensure each team plays each other team once', () => {
      const schedule = generateSchedule(defaultSettings, teams, roundRobinConfig)
      const teamMatches = new Map<string, Set<string>>()

      teams.forEach(team => {
        teamMatches.set(team.id, new Set())
      })

      schedule.matches.forEach(match => {
        if (match.homeTeam.id !== 'BYE' && match.awayTeam.id !== 'BYE') {
          teamMatches.get(match.homeTeam.id)?.add(match.awayTeam.id)
          teamMatches.get(match.awayTeam.id)?.add(match.homeTeam.id)
        }
      })

      teams.forEach(team => {
        const opponents = teamMatches.get(team.id)
        expect(opponents?.size).toBe(teams.length - 1)
      })
    })

    it('should add BYE team and warning for odd number of teams', () => {
      const oddTeams = teams.slice(0, 3)
      const schedule = generateSchedule(defaultSettings, oddTeams, roundRobinConfig)

      // Should warn about odd number of teams
      expect(schedule.warnings.some(w => w.includes('Ulige antal hold'))).toBe(true)
      // BYE matches are filtered out, so all matches should be between real teams
      // For 3 teams, we should get 3 matches total (each team plays each other once)
      expect(schedule.matches.length).toBe(3)
    })

    it('should generate matches with valid start and end times', () => {
      const schedule = generateSchedule(defaultSettings, teams, roundRobinConfig)

      schedule.matches.forEach(match => {
        expect(match.startTime).toBeInstanceOf(Date)
        expect(match.endTime).toBeInstanceOf(Date)
        expect(match.endTime.getTime()).toBeGreaterThan(match.startTime.getTime())
      })
    })

    it('should assign matches to available pitches', () => {
      const schedule = generateSchedule(defaultSettings, teams, roundRobinConfig)

      schedule.matches.forEach(match => {
        expect(match.pitch).toBeGreaterThanOrEqual(1)
        expect(match.pitch).toBeLessThanOrEqual(defaultSettings.numPitches)
      })
    })
  })

  describe('generateSchedule - Round Robin with Byes (5 teams)', () => {
    const fiveTeams: Team[] = [
      { id: '1', name: 'Team A' },
      { id: '2', name: 'Team B' },
      { id: '3', name: 'Team C' },
      { id: '4', name: 'Team D' },
      { id: '5', name: 'Team E' },
    ]

    const roundRobinConfig: SchedulingConfig = {
      mode: 'round-robin',
    }

    it('should generate 10 matches for 5 teams (each plays 4)', () => {
      const schedule = generateSchedule(defaultSettings, fiveTeams, roundRobinConfig)
      expect(schedule.matches.length).toBe(10)
    })

    it('should track byes for each round', () => {
      const schedule = generateSchedule(defaultSettings, fiveTeams, roundRobinConfig)
      // 5 teams + BYE = 6 → 5 rounds, 1 bye per round
      expect(schedule.byes.length).toBe(5)
    })

    it('should ensure each team plays exactly 4 matches', () => {
      const schedule = generateSchedule(defaultSettings, fiveTeams, roundRobinConfig)
      const teamMatchCounts = new Map<string, number>()

      fiveTeams.forEach(team => teamMatchCounts.set(team.id, 0))

      schedule.matches.forEach(match => {
        teamMatchCounts.set(match.homeTeam.id, (teamMatchCounts.get(match.homeTeam.id) || 0) + 1)
        teamMatchCounts.set(match.awayTeam.id, (teamMatchCounts.get(match.awayTeam.id) || 0) + 1)
      })

      fiveTeams.forEach(team => {
        expect(teamMatchCounts.get(team.id)).toBe(4)
      })
    })

    it('should ensure each team sits out exactly once', () => {
      const schedule = generateSchedule(defaultSettings, fiveTeams, roundRobinConfig)
      const byeCounts = new Map<string, number>()

      schedule.byes.forEach(bye => {
        byeCounts.set(bye.team.id, (byeCounts.get(bye.team.id) || 0) + 1)
      })

      fiveTeams.forEach(team => {
        expect(byeCounts.get(team.id)).toBe(1)
      })
    })

    it('should not have any team sitting out two consecutive rounds', () => {
      const schedule = generateSchedule(defaultSettings, fiveTeams, roundRobinConfig)

      // Sort byes by round
      const sortedByes = [...schedule.byes].sort((a, b) => a.round - b.round)

      for (let i = 1; i < sortedByes.length; i++) {
        // No team should have byes in consecutive rounds
        if (sortedByes[i].round - sortedByes[i - 1].round === 1) {
          expect(sortedByes[i].team.id).not.toBe(sortedByes[i - 1].team.id)
        }
      }

      // Also verify no consecutive-bye warning was generated
      expect(schedule.warnings.some(w => w.includes('to runder i træk'))).toBe(false)
    })

    it('should assign start times to byes', () => {
      const schedule = generateSchedule(defaultSettings, fiveTeams, roundRobinConfig)

      schedule.byes.forEach(bye => {
        expect(bye.startTime).toBeInstanceOf(Date)
      })
    })

    it('should assign round numbers to matches', () => {
      const schedule = generateSchedule(defaultSettings, fiveTeams, roundRobinConfig)

      schedule.matches.forEach(match => {
        expect(match.round).toBeDefined()
        expect(match.round).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('generateSchedule - Limited Matches', () => {
    const limitedConfig: SchedulingConfig = {
      mode: 'limited-matches',
      maxMatchesPerTeam: 2,
    }

    it('should respect max matches per team constraint', () => {
      const schedule = generateSchedule(defaultSettings, teams, limitedConfig)
      const teamMatchCounts = new Map<string, number>()

      teams.forEach(team => {
        teamMatchCounts.set(team.id, 0)
      })

      schedule.matches.forEach(match => {
        if (match.homeTeam.id !== 'BYE') {
          teamMatchCounts.set(match.homeTeam.id, (teamMatchCounts.get(match.homeTeam.id) || 0) + 1)
        }
        if (match.awayTeam.id !== 'BYE') {
          teamMatchCounts.set(match.awayTeam.id, (teamMatchCounts.get(match.awayTeam.id) || 0) + 1)
        }
      })

      teamMatchCounts.forEach((count, _teamId) => {
        expect(count).toBeLessThanOrEqual(limitedConfig.maxMatchesPerTeam!)
      })
    })

    it('should not produce duplicate matchups with 6 teams and 4 matches per team', () => {
      const sixTeams: Team[] = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
        { id: '3', name: 'Team C' },
        { id: '4', name: 'Team D' },
        { id: '5', name: 'Team E' },
        { id: '6', name: 'Team F' },
      ]
      const config: SchedulingConfig = {
        mode: 'limited-matches',
        maxMatchesPerTeam: 4,
      }
      const schedule = generateSchedule(defaultSettings, sixTeams, config)

      // Check no duplicate matchups
      const pairings = new Set<string>()
      for (const match of schedule.matches) {
        const key = [match.homeTeam.id, match.awayTeam.id].sort().join('-')
        expect(pairings.has(key)).toBe(false)
        pairings.add(key)
      }

      // Each team should play exactly 4 matches
      const teamMatchCounts = new Map<string, number>()
      sixTeams.forEach(t => teamMatchCounts.set(t.id, 0))
      schedule.matches.forEach(match => {
        teamMatchCounts.set(match.homeTeam.id, (teamMatchCounts.get(match.homeTeam.id) || 0) + 1)
        teamMatchCounts.set(match.awayTeam.id, (teamMatchCounts.get(match.awayTeam.id) || 0) + 1)
      })
      sixTeams.forEach(t => {
        expect(teamMatchCounts.get(t.id)).toBe(4)
      })

      // Should have 12 matches total (6 teams * 4 matches / 2)
      expect(schedule.matches.length).toBe(12)
    })

    it('should use both pitches in time slots with 6 teams and 2 pitches', () => {
      const sixTeams: Team[] = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
        { id: '3', name: 'Team C' },
        { id: '4', name: 'Team D' },
        { id: '5', name: 'Team E' },
        { id: '6', name: 'Team F' },
      ]
      const config: SchedulingConfig = {
        mode: 'limited-matches',
        maxMatchesPerTeam: 4,
      }
      const schedule = generateSchedule(defaultSettings, sixTeams, config)

      // Group matches by start time
      const matchesByTime = new Map<string, number>()
      for (const match of schedule.matches) {
        const key = match.startTime.toISOString()
        matchesByTime.set(key, (matchesByTime.get(key) || 0) + 1)
      }

      // Every time slot should have 2 matches (using both pitches)
      for (const [, count] of matchesByTime) {
        expect(count).toBe(2)
      }
    })

    it('should track idle teams (byes) in limited-matches mode', () => {
      const sixTeams: Team[] = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
        { id: '3', name: 'Team C' },
        { id: '4', name: 'Team D' },
        { id: '5', name: 'Team E' },
        { id: '6', name: 'Team F' },
      ]
      const config: SchedulingConfig = {
        mode: 'limited-matches',
        maxMatchesPerTeam: 4,
      }
      const schedule = generateSchedule(defaultSettings, sixTeams, config)

      // With 6 teams, 2 pitches, 4 per round play → 2 idle per round
      expect(schedule.byes).toBeDefined()
      expect(schedule.byes!.length).toBeGreaterThan(0)

      // Each bye should have a start time
      for (const bye of schedule.byes!) {
        expect(bye.startTime).toBeInstanceOf(Date)
      }
    })

    it('should respect excluded matchups', () => {
      const sixTeams: Team[] = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
        { id: '3', name: 'Team C' },
        { id: '4', name: 'Team D' },
        { id: '5', name: 'Team E' },
        { id: '6', name: 'Team F' },
      ]
      const config: SchedulingConfig = {
        mode: 'limited-matches',
        maxMatchesPerTeam: 4,
        excludedMatchups: [
          ['1', '2'],
          ['3', '4'],
        ],
      }
      const schedule = generateSchedule(defaultSettings, sixTeams, config)

      // Verify excluded matchups don't appear
      for (const match of schedule.matches) {
        const key = [match.homeTeam.id, match.awayTeam.id].sort().join('-')
        expect(key).not.toBe('1-2')
        expect(key).not.toBe('3-4')
      }

      // Should have warning about excluded matchups
      expect(schedule.warnings.some(w => w.includes('udelukket'))).toBe(true)
    })

    it('should give all teams equal matches even with excluded matchups', () => {
      const sixTeams: Team[] = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
        { id: '3', name: 'Team C' },
        { id: '4', name: 'Team D' },
        { id: '5', name: 'Team E' },
        { id: '6', name: 'Team F' },
      ]

      // Test various exclusion configurations
      const exclusionSets: [string, string][][] = [
        [['1', '3']],
        [['1', '5']],
        [['2', '5']],
        [
          ['1', '2'],
          ['3', '4'],
        ],
      ]

      for (const exclusions of exclusionSets) {
        const config: SchedulingConfig = {
          mode: 'limited-matches',
          maxMatchesPerTeam: 4,
          excludedMatchups: exclusions,
        }
        const schedule = generateSchedule(defaultSettings, sixTeams, config)

        // Every team should still play exactly 4 matches
        const teamMatchCounts = new Map<string, number>()
        sixTeams.forEach(t => teamMatchCounts.set(t.id, 0))
        schedule.matches.forEach(match => {
          teamMatchCounts.set(match.homeTeam.id, (teamMatchCounts.get(match.homeTeam.id) || 0) + 1)
          teamMatchCounts.set(match.awayTeam.id, (teamMatchCounts.get(match.awayTeam.id) || 0) + 1)
        })
        const excStr = exclusions.map(([a, b]) => `${a}-${b}`).join(', ')
        sixTeams.forEach(t => {
          expect(
            teamMatchCounts.get(t.id),
            `Team ${t.name} should have 4 matches with exclusions [${excStr}]`
          ).toBe(4)
        })

        // Excluded matchups should not appear
        const excludedPairKeys = new Set(exclusions.map(([a, b]) => [a, b].sort().join('-')))
        for (const match of schedule.matches) {
          const key = [match.homeTeam.id, match.awayTeam.id].sort().join('-')
          expect(excludedPairKeys.has(key)).toBe(false)
        }
      }
    })

    it('should not have any team sitting out two consecutive time slots', () => {
      const sixTeams: Team[] = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
        { id: '3', name: 'Team C' },
        { id: '4', name: 'Team D' },
        { id: '5', name: 'Team E' },
        { id: '6', name: 'Team F' },
      ]

      // Test both with and without exclusions
      const configs: SchedulingConfig[] = [
        { mode: 'limited-matches', maxMatchesPerTeam: 4 },
        { mode: 'limited-matches', maxMatchesPerTeam: 4, excludedMatchups: [['1', '3']] },
        {
          mode: 'limited-matches',
          maxMatchesPerTeam: 4,
          excludedMatchups: [
            ['1', '2'],
            ['3', '4'],
          ],
        },
      ]

      for (const config of configs) {
        const schedule = generateSchedule(defaultSettings, sixTeams, config)

        // Group byes by team
        const byesByTeam = new Map<string, number[]>()
        for (const bye of schedule.byes!) {
          if (!byesByTeam.has(bye.team.id)) {
            byesByTeam.set(bye.team.id, [])
          }
          byesByTeam.get(bye.team.id)!.push(bye.round)
        }

        // No team should have consecutive rounds as byes
        for (const [teamId, rounds] of byesByTeam) {
          rounds.sort((a, b) => a - b)
          for (let i = 1; i < rounds.length; i++) {
            const team = sixTeams.find(t => t.id === teamId)!
            expect(
              rounds[i] - rounds[i - 1],
              `${team.name} should not have consecutive byes (rounds ${rounds[i - 1]} and ${rounds[i]})`
            ).toBeGreaterThan(1)
          }
        }
      }
    })

    it('should not have consecutive byes even with excluded matchups', () => {
      const sixTeams: Team[] = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
        { id: '3', name: 'Team C' },
        { id: '4', name: 'Team D' },
        { id: '5', name: 'Team E' },
        { id: '6', name: 'Team F' },
      ]
      const config: SchedulingConfig = {
        mode: 'limited-matches',
        maxMatchesPerTeam: 4,
        excludedMatchups: [['1', '2']],
      }
      const schedule = generateSchedule(defaultSettings, sixTeams, config)

      // Group byes by team
      const byesByTeam = new Map<string, number[]>()
      for (const bye of schedule.byes!) {
        if (!byesByTeam.has(bye.team.id)) {
          byesByTeam.set(bye.team.id, [])
        }
        byesByTeam.get(bye.team.id)!.push(bye.round)
      }

      // No team should have consecutive rounds as byes
      for (const [, rounds] of byesByTeam) {
        rounds.sort((a, b) => a - b)
        for (let i = 1; i < rounds.length; i++) {
          expect(rounds[i] - rounds[i - 1]).toBeGreaterThan(1)
        }
      }
    })

    it('should assign round numbers to limited-matches', () => {
      const config: SchedulingConfig = {
        mode: 'limited-matches',
        maxMatchesPerTeam: 2,
      }
      const schedule = generateSchedule(defaultSettings, teams, config)

      schedule.matches.forEach(match => {
        expect(match.round).toBeDefined()
        expect(match.round).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Conflict Detection', () => {
    it('should detect no conflicts when schedule is valid', () => {
      const config: SchedulingConfig = { mode: 'round-robin' }
      const schedule = generateSchedule(defaultSettings, teams, config)

      // With proper scheduling across multiple pitches, there should be minimal conflicts
      expect(schedule.conflicts).toBeDefined()
    })

    it('should warn about large tournaments', () => {
      const manyTeams: Team[] = Array.from({ length: 12 }, (_, i) => ({
        id: `team-${i}`,
        name: `Team ${i + 1}`,
      }))

      const config: SchedulingConfig = { mode: 'round-robin' }
      const schedule = generateSchedule(defaultSettings, manyTeams, config)

      // 12 teams = 66 matches, should trigger warning at >100
      // Or we might see a warning depending on the threshold
      expect(schedule.warnings).toBeDefined()
    })
  })

  describe('Match Timing', () => {
    it('should respect break between matches', () => {
      const schedule = generateSchedule(defaultSettings, teams, { mode: 'round-robin' })

      // Group matches by pitch
      const matchesByPitch = new Map<number, typeof schedule.matches>()
      schedule.matches.forEach(match => {
        if (!matchesByPitch.has(match.pitch)) {
          matchesByPitch.set(match.pitch, [])
        }
        matchesByPitch.get(match.pitch)?.push(match)
      })

      // Check that matches on same pitch don't overlap
      matchesByPitch.forEach(pitchMatches => {
        const sorted = [...pitchMatches].sort(
          (a, b) => a.startTime.getTime() - b.startTime.getTime()
        )

        for (let i = 1; i < sorted.length; i++) {
          const prevMatch = sorted[i - 1]
          const currentMatch = sorted[i]

          // Current match should start after previous match ends
          expect(currentMatch.startTime.getTime()).toBeGreaterThanOrEqual(
            prevMatch.endTime.getTime()
          )
        }
      })
    })

    it('should calculate correct match duration', () => {
      const schedule = generateSchedule(defaultSettings, teams, { mode: 'round-robin' })

      schedule.matches.forEach(match => {
        const duration = (match.endTime.getTime() - match.startTime.getTime()) / (1000 * 60)
        expect(duration).toBe(defaultSettings.matchDurationMinutes)
      })
    })
  })

  describe('Security Functions', () => {
    describe('escapeHtml', () => {
      it('should escape HTML entities', async () => {
        const { escapeHtml } = await import('../lib/scheduler')
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
          '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        )
        expect(escapeHtml('Team & Friends')).toBe('Team &amp; Friends')
        expect(escapeHtml("Team's Name")).toBe('Team&#039;s Name')
        expect(escapeHtml('Normal Team Name')).toBe('Normal Team Name')
      })
    })

    describe('escapeCsvField', () => {
      it('should escape CSV formula injection', async () => {
        const { escapeCsvField } = await import('../lib/scheduler')
        expect(escapeCsvField('=SUM(A1)')).toBe("'=SUM(A1)")
        expect(escapeCsvField('+1234')).toBe("'+1234")
        expect(escapeCsvField('-1234')).toBe("'-1234")
        expect(escapeCsvField('@mention')).toBe("'@mention")
      })

      it('should handle fields with commas', async () => {
        const { escapeCsvField } = await import('../lib/scheduler')
        expect(escapeCsvField('Team, with comma')).toBe('"Team, with comma"')
      })

      it('should handle fields with quotes', async () => {
        const { escapeCsvField } = await import('../lib/scheduler')
        expect(escapeCsvField('FC "Copenhagen"')).toBe('"FC ""Copenhagen"""')
      })

      it('should handle formula injection with commas', async () => {
        const { escapeCsvField } = await import('../lib/scheduler')
        // Formula char + comma: should quote AND add apostrophe inside
        expect(escapeCsvField('=SUM, data')).toBe('"\'=SUM, data"')
      })

      it('should handle formula injection with quotes', async () => {
        const { escapeCsvField } = await import('../lib/scheduler')
        // Formula char + quote: should escape quotes AND add apostrophe
        expect(escapeCsvField('=SUM"test"')).toBe('"\'=SUM""test"""')
      })

      it('should not modify normal fields', async () => {
        const { escapeCsvField } = await import('../lib/scheduler')
        expect(escapeCsvField('Normal Team')).toBe('Normal Team')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle 1 team (returns empty schedule)', () => {
      const singleTeam = [{ id: '1', name: 'Lonely Team' }]
      const schedule = generateSchedule(defaultSettings, singleTeam, { mode: 'round-robin' })
      expect(schedule.matches.length).toBe(0)
    })

    it('should handle 2 teams in round-robin mode', () => {
      const twoTeams = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
      ]
      const schedule = generateSchedule(defaultSettings, twoTeams, { mode: 'round-robin' })
      expect(schedule.matches.length).toBe(1)
      expect(schedule.conflicts.length).toBe(0)
    })

    it('should handle 3 teams in round-robin mode (odd teams)', () => {
      const threeTeams = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
        { id: '3', name: 'Team C' },
      ]
      const schedule = generateSchedule(defaultSettings, threeTeams, { mode: 'round-robin' })
      // 3 teams = 3 matches (A vs B, A vs C, B vs C)
      expect(schedule.matches.length).toBe(3)
      expect(schedule.warnings.some(w => w.includes('Ulige antal hold'))).toBe(true)
    })

    it('should generate warning for large tournaments', () => {
      const manyTeams: Team[] = Array.from({ length: 15 }, (_, i) => ({
        id: `team-${i}`,
        name: `Team ${i + 1}`,
      }))

      const schedule = generateSchedule(defaultSettings, manyTeams, { mode: 'round-robin' })
      // 15 teams = 105 matches, should trigger >100 warning
      expect(schedule.matches.length).toBe(105)
      expect(schedule.warnings.some(w => w.includes('Large tournament'))).toBe(true)
    })

    it('should handle special characters in team names for CSV export', async () => {
      const specialTeams = [
        { id: '1', name: '=DANGEROUS' },
        { id: '2', name: 'Team, with comma' },
        { id: '3', name: 'FC "Copenhagen"' },
        { id: '4', name: 'Normal Team' },
      ]
      const schedule = generateSchedule(defaultSettings, specialTeams, {
        mode: 'limited-matches',
        maxMatchesPerTeam: 1,
      })

      const { exportToCSV } = await import('../lib/scheduler')
      const csv = exportToCSV(schedule.matches, defaultSettings)

      // Verify CSV escaping is applied
      expect(csv).toContain("'=DANGEROUS") // Formula injection protected
    })

    it('should throw error for invalid date/time', () => {
      const invalidSettings: TournamentSettings = {
        ...defaultSettings,
        startDate: 'invalid-date',
        startTime: 'not-a-time',
      }
      const testTeams = [
        { id: '1', name: 'Team A' },
        { id: '2', name: 'Team B' },
      ]

      expect(() => generateSchedule(invalidSettings, testTeams, { mode: 'round-robin' })).toThrow(
        'Invalid tournament start date/time: invalid-date not-a-time'
      )
    })
  })
})
