import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Step2Teams } from '../components/Step2Teams'
import type { Team } from '../lib/types'

const renderStep2 = (initialTeams: Team[] = [], onNext = vi.fn(), onBack = vi.fn()) => {
  render(<Step2Teams initialTeams={initialTeams} onNext={onNext} onBack={onBack} />)
  return { onNext, onBack }
}

const teamNameInput = () => screen.getByLabelText('Tilføj Hold Individuelt')
const addButton = () => screen.getByRole('button', { name: 'Tilføj' })

describe('Step2Teams', () => {
  it('adds a team via the input and Tilføj button', async () => {
    const user = userEvent.setup()
    renderStep2()

    await user.type(teamNameInput(), 'Lions')
    await user.click(addButton())

    expect(screen.getByText('Lions')).toBeInTheDocument()
    expect(screen.getByText('Hold (1)')).toBeInTheDocument()
    expect(teamNameInput()).toHaveValue('')
  })

  it('adds a team when pressing Enter in the input', async () => {
    const user = userEvent.setup()
    renderStep2()

    await user.type(teamNameInput(), 'Tigers{Enter}')

    expect(screen.getByText('Tigers')).toBeInTheDocument()
    expect(screen.getByText('Hold (1)')).toBeInTheDocument()
  })

  it('rejects duplicate team names case-insensitively', async () => {
    const user = userEvent.setup()
    renderStep2([{ id: 't1', name: 'Lions' }])

    await user.type(teamNameInput(), 'LIONS')
    await user.click(addButton())

    expect(screen.getByText('Hold "LIONS" eksisterer allerede. Prøv "LIONS 2"')).toBeInTheDocument()
    expect(screen.getByText('Hold (1)')).toBeInTheDocument()
  })

  it('shows an error when adding an empty team name', async () => {
    const user = userEvent.setup()
    renderStep2()

    await user.click(addButton())

    expect(screen.getByText('Holdnavn kan ikke være tomt')).toBeInTheDocument()
    expect(screen.getByText('Ingen hold tilføjet endnu')).toBeInTheDocument()
  })

  it('bulk-adds one team per non-empty line and skips duplicates with an error message', async () => {
    const user = userEvent.setup()
    renderStep2([{ id: 't1', name: 'Alpha' }])

    const textarea = screen.getByLabelText('Tilføj Hold Samlet')
    await user.click(textarea)
    await user.paste('Beta\n\n  Gamma  \nalpha\nBeta')
    await user.click(screen.getByRole('button', { name: 'Tilføj Alle Hold' }))

    // Beta and Gamma added; "alpha" (existing, case-insensitive) and the
    // second "Beta" (duplicate within the paste) are skipped.
    expect(screen.getByText('Hold (3)')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
    expect(screen.getByText('Sprunget over duplikerede hold: alpha, Beta')).toBeInTheDocument()
    expect(textarea).toHaveValue('')
  })

  it('removes a team via its remove button', async () => {
    const user = userEvent.setup()
    renderStep2([
      { id: 't1', name: 'Alpha' },
      { id: 't2', name: 'Beta' },
    ])

    const alphaRow = screen.getByText('Alpha').closest('div')!.parentElement!
    await user.click(within(alphaRow).getByRole('button'))

    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByText('Hold (1)')).toBeInTheDocument()
  })

  it('disables Næste with fewer than 2 teams and calls onNext with the teams when valid', async () => {
    const user = userEvent.setup()
    const { onNext } = renderStep2([{ id: 't1', name: 'Alpha' }])

    const nextButton = screen.getByRole('button', { name: /Næste/ })
    expect(nextButton).toBeDisabled()

    await user.type(teamNameInput(), 'Beta{Enter}')

    expect(nextButton).toBeEnabled()
    await user.click(nextButton)

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledWith([
      expect.objectContaining({ id: 't1', name: 'Alpha' }),
      expect.objectContaining({ name: 'Beta' }),
    ])
  })
})
