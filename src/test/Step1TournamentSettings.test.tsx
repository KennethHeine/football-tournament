import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Step1TournamentSettings } from '../components/Step1TournamentSettings'
import type { TournamentSettings } from '../lib/types'

const baseSettings: TournamentSettings = {
  name: 'Sommer Cup',
  startDate: '2099-06-20',
  startTime: '10:00',
  numPitches: 2,
  pitchNames: ['Bane 1', 'Bane 2'],
  matchMode: 'full-time',
  matchDurationMinutes: 20,
  breakBetweenMatches: 5,
}

describe('Step1TournamentSettings', () => {
  it('renders initial data and submits via Næste, passing the form data including pitchNames', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()

    render(<Step1TournamentSettings initialData={baseSettings} onNext={onNext} />)

    expect(screen.getByText('Turneringsindstillinger')).toBeInTheDocument()
    expect(screen.getByLabelText('Turneringsnavn (Valgfri)')).toHaveValue('Sommer Cup')
    expect(screen.getByLabelText('Startdato *')).toHaveValue('2099-06-20')
    expect(screen.getByLabelText('Starttidspunkt *')).toHaveValue('10:00')
    expect(screen.getByLabelText('Antal Baner *')).toHaveValue(2)
    expect(screen.getByLabelText('Kampvarighed (minutter) *')).toHaveValue(20)
    expect(screen.getByLabelText('Pause Mellem Kampe (minutter) *')).toHaveValue(5)

    await user.click(screen.getByRole('button', { name: /Næste/ }))

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1))
    expect(onNext).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sommer Cup',
        startDate: '2099-06-20',
        startTime: '10:00',
        numPitches: 2,
        matchMode: 'full-time',
        matchDurationMinutes: 20,
        breakBetweenMatches: 5,
        pitchNames: ['Bane 1', 'Bane 2'],
      })
    )
  })

  it('grows and shrinks the pitch name inputs when Antal Baner changes', async () => {
    const user = userEvent.setup()

    render(<Step1TournamentSettings initialData={baseSettings} onNext={vi.fn()} />)

    expect(screen.getAllByLabelText(/^Bane \d+$/)).toHaveLength(2)

    const numPitches = screen.getByLabelText('Antal Baner *')
    await user.clear(numPitches)
    await user.type(numPitches, '4')

    await waitFor(() => expect(screen.getAllByLabelText(/^Bane \d+$/)).toHaveLength(4))
    expect(screen.getByLabelText('Bane 4')).toHaveValue('Bane 4')

    await user.clear(numPitches)
    await user.type(numPitches, '1')

    await waitFor(() => expect(screen.getAllByLabelText(/^Bane \d+$/)).toHaveLength(1))
    expect(screen.queryByLabelText('Bane 2')).not.toBeInTheDocument()
  })

  it('shows the full-time duration field when matchMode is full-time', () => {
    render(<Step1TournamentSettings initialData={baseSettings} onNext={vi.fn()} />)

    expect(screen.getByLabelText('Kampvarighed (minutter) *')).toBeInTheDocument()
    expect(screen.queryByLabelText('Halvlegvarighed (minutter) *')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Pauselængde (minutter) *')).not.toBeInTheDocument()
    // The radix Select trigger reflects the watched matchMode value
    expect(screen.getByRole('combobox')).toHaveTextContent('Fuldtid (kontinuerlig kamp)')
  })

  it('shows the half duration fields when matchMode is two-halves', () => {
    const twoHalvesSettings: TournamentSettings = {
      ...baseSettings,
      matchMode: 'two-halves',
      matchDurationMinutes: undefined,
      halfDurationMinutes: 10,
      halftimeBreakMinutes: 2,
    }

    render(<Step1TournamentSettings initialData={twoHalvesSettings} onNext={vi.fn()} />)

    expect(screen.getByLabelText('Halvlegvarighed (minutter) *')).toHaveValue(10)
    expect(screen.getByLabelText('Pauselængde (minutter) *')).toHaveValue(2)
    expect(screen.queryByLabelText('Kampvarighed (minutter) *')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent('To halvlege (med pause)')
  })

  it('shows a Danish validation error and does not submit when startDate is cleared', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()

    render(<Step1TournamentSettings initialData={baseSettings} onNext={onNext} />)

    await user.clear(screen.getByLabelText('Startdato *'))
    await user.click(screen.getByRole('button', { name: /Næste/ }))

    expect(await screen.findByText('Startdato er påkrævet')).toBeInTheDocument()
    expect(onNext).not.toHaveBeenCalled()
  })
})
