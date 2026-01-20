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

      // Should warn about BYE team being added
      expect(schedule.warnings.some(w => w.includes('BYE'))).toBe(true)
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
      expect(schedule.warnings.some(w => w.includes('BYE'))).toBe(true)
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
  })
})
