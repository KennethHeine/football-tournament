import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Step4Schedule } from '../components/Step4Schedule'
import { exportToCSV, generateSchedule } from '../lib/scheduler'
import type { Match, Team, TournamentSettings } from '../lib/types'

const settings: TournamentSettings = {
  name: 'Test Cup',
  startDate: '2026-06-20',
  startTime: '10:00',
  numPitches: 2,
  pitchNames: ['Bane 1', 'Bane 2'],
  matchMode: 'full-time',
  matchDurationMinutes: 20,
  breakBetweenMatches: 5,
}

const fourTeams: Team[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
  { id: 'd', name: 'Delta' },
]

const fourTeamSchedule = () => generateSchedule(settings, fourTeams, { mode: 'round-robin' })

const renderStep4 = (
  schedule = fourTeamSchedule(),
  teams = fourTeams,
  overrides: Partial<Parameters<typeof Step4Schedule>[0]> = {}
) => {
  render(
    <Step4Schedule
      schedule={schedule}
      tournamentName="Test Cup"
      teams={teams}
      settings={settings}
      onBack={vi.fn()}
      onSave={vi.fn()}
      onShare={vi.fn()}
      {...overrides}
    />
  )
  return schedule
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Step4Schedule', () => {
  it('renders the schedule table with all matches, HH:MM times, team names and pitch badges', () => {
    const schedule = renderStep4()

    // 4-team round robin on 2 pitches: 6 matches in 3 simultaneous slots
    expect(schedule.matches).toHaveLength(6)

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(1 + 6) // header + one row per match

    // Slot start times (rowspan cells) and per-match end times, all HH:MM
    expect(within(table).getByText('10:00')).toBeInTheDocument()
    expect(within(table).getByText('10:25')).toBeInTheDocument()
    expect(within(table).getByText('10:50')).toBeInTheDocument()
    const timeCells = within(table).getAllByText(/^\d{2}:\d{2}$/)
    expect(timeCells).toHaveLength(3 + 6) // 3 slot starts + 6 end times

    // Every team plays 3 matches
    for (const team of fourTeams) {
      expect(within(table).getAllByText(team.name)).toHaveLength(3)
    }

    // Pitch badges: one match per pitch in each of the 3 slots
    expect(within(table).getAllByText('Bane 1')).toHaveLength(3)
    expect(within(table).getAllByText('Bane 2')).toHaveLength(3)
  })

  it('downloads a CSV via the CSV button using a blob object URL', async () => {
    const user = userEvent.setup()
    // jsdom does not implement object URLs; install mocks for the download path
    const createObjectURL = vi.fn((_blob: Blob | MediaSource) => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    try {
      renderStep4()
      await user.click(screen.getByRole('button', { name: /CSV/ }))

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      const blob = createObjectURL.mock.calls[0][0] as Blob
      // The download is prefixed with a UTF-8 BOM for Excel (blob.text() strips
      // it while decoding, so assert on the raw bytes) and uses CRLF (RFC 4180).
      const bytes = new Uint8Array(await blob.arrayBuffer())
      expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
      const content = await blob.text()
      expect(content.replace(/^\uFEFF/, '').split('\r\n')[0]).toBe(
        'Time,Pitch,Home Team,Away Team,End Time'
      )
      expect(click).toHaveBeenCalledTimes(1)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    } finally {
      delete (URL as { createObjectURL?: unknown }).createObjectURL
      delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL
    }
  })

  it('shows an empty state when the search matches no team', async () => {
    const user = userEvent.setup()
    renderStep4()

    await user.type(screen.getByPlaceholderText('Søg hold...'), 'Findes Ikke')

    expect(
      await screen.findByText('Ingen kampe fundet der matcher dine filtre')
    ).toBeInTheDocument()
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('copies the text schedule to the clipboard via the Kopiér button', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn((_text: string) => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    renderStep4()
    await user.click(screen.getByRole('button', { name: /Kopiér/ }))

    expect(writeText).toHaveBeenCalledTimes(1)
    const text = writeText.mock.calls[0][0]
    expect(text).toContain('FOOTBALL TOURNAMENT SCHEDULE')
    expect(text).toContain('Bane 1: ')
    expect(await screen.findByText('Kopieret!')).toBeInTheDocument()
  })

  it('shows two-halves timing info when the match mode is two-halves', () => {
    const twoHalvesSettings: TournamentSettings = {
      ...settings,
      matchMode: 'two-halves',
      matchDurationMinutes: undefined,
      halfDurationMinutes: 10,
      halftimeBreakMinutes: 5,
    }
    const schedule = generateSchedule(twoHalvesSettings, fourTeams, { mode: 'round-robin' })
    renderStep4(schedule, fourTeams, { settings: twoHalvesSettings })

    expect(screen.getByText('Spilletid: 2 × 10 min | Halvleg pause: 5 min')).toBeInTheDocument()
  })

  it('renders Oversidder rows for the idle team in an odd (3-team) round robin', () => {
    const threeTeams = fourTeams.slice(0, 3)
    const schedule = generateSchedule(settings, threeTeams, { mode: 'round-robin' })
    renderStep4(schedule, threeTeams)

    // 3 teams: 3 matches, one per slot, with one team sitting out each slot
    expect(schedule.matches).toHaveLength(3)
    const table = screen.getByRole('table')
    const byeRows = within(table).getAllByText(/Oversidder:/)
    expect(byeRows).toHaveLength(3)
    // Each team sits out exactly once
    const byeText = byeRows.map(row => row.textContent).join(' ')
    for (const team of threeTeams) {
      expect(byeText).toContain(team.name)
    }
    // Odd-team warning surfaces above the table
    expect(screen.getByText('Ulige antal hold: Et hold sidder over i hver runde')).toBeVisible()
  })
})

describe('exportToCSV', () => {
  const makeMatch = (home: string, away: string): Match => ({
    id: 'm1',
    homeTeam: { id: 'h', name: home },
    awayTeam: { id: 'u', name: away },
    startTime: new Date('2026-06-20T10:00:00'),
    endTime: new Date('2026-06-20T10:20:00'),
    pitch: 1,
    round: 0,
  })

  it('writes a header row and one line per match', () => {
    const schedule = generateSchedule(settings, fourTeams, { mode: 'round-robin' })
    const csv = exportToCSV(schedule.matches, settings)
    const lines = csv.split(/\r?\n/)

    expect(lines[0]).toBe('Time,Pitch,Home Team,Away Team,End Time')
    expect(lines).toHaveLength(1 + 6)
    expect(lines[1]).toMatch(/^\d{2}:\d{2},Bane \d,[^,]+,[^,]+,\d{2}:\d{2}$/)
  })

  it('quotes fields containing commas and quotes per RFC 4180', () => {
    const csv = exportToCSV([makeMatch('Lyngby "B", Øst', 'Plain')], settings)
    const row = csv.split(/\r?\n/)[1]

    expect(row).toBe('10:00,Bane 1,"Lyngby ""B"", Øst",Plain,10:20')
  })

  it('prefixes formula-injection team names with an apostrophe', () => {
    const csv = exportToCSV([makeMatch('=cmd()', '+SUM(A1)')], settings)
    const row = csv.split(/\r?\n/)[1]

    expect(row).toBe("10:00,Bane 1,'=cmd(),'+SUM(A1),10:20")
  })
})
