import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { generateSchedule } from '../lib/scheduler'
import type { Team, Tournament, TournamentSettings } from '../lib/types'

// PWAUpdatePrompt imports the virtual:pwa-register module, which only exists
// in the Vite PWA build pipeline — stub it out for unit tests.
vi.mock('@/components/PWAUpdatePrompt', () => ({
  PWAUpdatePrompt: () => null,
}))

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

/**
 * Persists a finished tournament to localStorage the way the app saves it:
 * JSON round-tripped, so the schedule's Date objects become ISO strings.
 */
function seedSavedTournament(name: string): Tournament {
  const settings: TournamentSettings = {
    name,
    startDate: '2026-06-20',
    startTime: '10:00',
    numPitches: 2,
    pitchNames: ['Bane 1', 'Bane 2'],
    matchMode: 'full-time',
    matchDurationMinutes: 20,
    breakBetweenMatches: 5,
  }
  const teams: Team[] = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
    { id: 'c', name: 'Gamma' },
    { id: 'd', name: 'Delta' },
  ]
  const tournament: Tournament = {
    id: `saved-${name}`,
    settings,
    teams,
    schedulingConfig: { mode: 'round-robin' },
    schedule: generateSchedule(settings, teams, { mode: 'round-robin' }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem('tournaments', JSON.stringify([tournament]))
  return tournament
}

/** The saved-tournament rows use icon-only (unnamed) copy/delete buttons. */
const unnamedButtons = () =>
  screen.getAllByRole('button').filter(button => button.textContent?.trim() === '')

async function completeWizard(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: /Opret Ny Turnering/ }))

  // Step 1: defaults are valid (date defaults to today, which satisfies min)
  await user.type(screen.getByLabelText('Turneringsnavn (Valgfri)'), name)
  await user.click(screen.getByRole('button', { name: /Næste/ }))

  // Step 2: add two teams
  const teamInput = await screen.findByLabelText('Tilføj Hold Individuelt')
  await user.type(teamInput, 'Rød{Enter}')
  await user.type(teamInput, 'Blå{Enter}')
  await user.click(screen.getByRole('button', { name: /Næste/ }))

  // Step 3: generate the schedule
  await user.click(await screen.findByRole('button', { name: /Generer/ }))

  // Step 4: schedule table is shown
  return await screen.findByRole('table')
}

describe('App wizard navigation and persistence', () => {
  it('shows the landing page and enters step 1 when starting a new tournament', async () => {
    const user = userEvent.setup()
    render(<App />)

    const createButton = screen.getByRole('button', { name: /Opret Ny Turnering/ })
    expect(createButton).toBeInTheDocument()

    await user.click(createButton)

    expect(await screen.findByText('Turneringsindstillinger')).toBeInTheDocument()
  })

  it('completes the full happy path and saves the tournament to localStorage', async () => {
    const user = userEvent.setup()
    render(<App />)

    const table = await completeWizard(user, 'Test Cup')

    // Two teams → one match, rendered with HH:MM times
    expect(within(table).getByText('Rød')).toBeInTheDocument()
    expect(within(table).getByText('Blå')).toBeInTheDocument()
    expect(within(table).getAllByText(/^\d{2}:\d{2}$/).length).toBeGreaterThanOrEqual(2)

    await user.click(screen.getByRole('button', { name: /Gem Turnering/ }))

    // Back on the landing page with the saved tournament listed
    expect(await screen.findByText('Gemte Turneringer')).toBeInTheDocument()
    expect(screen.getByText('Test Cup')).toBeInTheDocument()
    expect(await screen.findByText('Turnering gemt!')).toBeInTheDocument()

    const stored = JSON.parse(localStorage.getItem('tournaments') || '[]') as Tournament[]
    expect(stored).toHaveLength(1)
    expect(stored[0].settings.name).toBe('Test Cup')
    expect(stored[0].teams.map(t => t.name)).toEqual(['Rød', 'Blå'])
    expect(stored[0].schedule?.matches).toHaveLength(1)

    // Clicking the saved tournament row reopens the schedule view
    await user.click(screen.getByText('Test Cup'))
    const reopened = await screen.findByRole('table')
    expect(within(reopened).getByText('Rød')).toBeInTheDocument()
  })

  it('rehydrates a saved tournament from localStorage when its row is clicked', async () => {
    seedSavedTournament('Gemt Cup')
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Gemte Turneringer')).toBeInTheDocument()
    await user.click(screen.getByText('Gemt Cup'))

    const table = await screen.findByRole('table')
    expect(within(table).getByText('10:00')).toBeInTheDocument()
    expect(within(table).getByText('10:25')).toBeInTheDocument()
    expect(within(table).getByText('10:50')).toBeInTheDocument()
    expect(within(table).getAllByText('Alpha')).toHaveLength(3)
  })

  it('copies a saved tournament from the landing page', async () => {
    seedSavedTournament('Original Cup')
    const user = userEvent.setup()
    render(<App />)

    // Row buttons are [copy, delete] in DOM order
    await user.click(unnamedButtons()[0])

    expect(await screen.findByText('Original Cup (Kopi)')).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem('tournaments') || '[]') as Tournament[]
    expect(stored).toHaveLength(2)
  })

  it('deletes a saved tournament after confirming the dialog', async () => {
    seedSavedTournament('Slet Cup')
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByText('Slet Cup')).toBeInTheDocument()
    await user.click(unnamedButtons()[1])

    expect(await screen.findByText('Slet Turnering')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Slet' }))

    expect(screen.queryByText('Slet Cup')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('tournaments') || '[]')).toHaveLength(0)
  })
})
