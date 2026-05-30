import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Step3SchedulingMode } from '../components/Step3SchedulingMode'
import type { SchedulingConfig, Team } from '../lib/types'

describe('Step3SchedulingMode', () => {
  const teams: Team[] = [
    { id: '1', name: 'Karlslunde' },
    { id: '2', name: 'RB' },
    { id: '3', name: 'Herlufsholm' },
    { id: '4', name: 'Solrød' },
  ]

  it('allows the max matches per team field to be cleared before entering a new value', async () => {
    const user = userEvent.setup()
    const initialConfig: SchedulingConfig = {
      mode: 'limited-matches',
      maxMatchesPerTeam: 3,
    }

    render(
      <Step3SchedulingMode
        initialConfig={initialConfig}
        teamCount={teams.length}
        teams={teams}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    )

    const input = screen.getByLabelText('Maks kampe pr. hold *')

    await user.clear(input)
    expect(input).toHaveValue(null)

    await user.type(input, '4')
    expect(input).toHaveValue(4)
  })
})
