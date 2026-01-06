import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Stepper } from '@/components/Stepper'
import { Step1TournamentSettings } from '@/components/Step1TournamentSettings'
import { Step2Teams } from '@/components/Step2Teams'
import { Step3SchedulingMode } from '@/components/Step3SchedulingMode'
import { Step4Schedule } from '@/components/Step4Schedule'
import type { Tournament, TournamentSettings, Team, SchedulingConfig, GeneratedSchedule } from '@/lib/types'
import { generateSchedule } from '@/lib/scheduler'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash, CalendarBlank } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

const INITIAL_SETTINGS: TournamentSettings = {
  name: '',
  startDate: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  numPitches: 2,
  matchMode: 'full-time',
  matchDurationMinutes: 30,
  breakBetweenMatches: 5,
}

const INITIAL_CONFIG: SchedulingConfig = {
  mode: 'round-robin',
}

const steps = [
  { number: 1, title: 'Tournament Setup' },
  { number: 2, title: 'Add Teams' },
  { number: 3, title: 'Scheduling Mode' },
  { number: 4, title: 'Generate & View' },
]

function App() {
  const [tournaments, setTournaments] = useKV<Tournament[]>('tournaments', [])
  const [currentStep, setCurrentStep] = useState(0)
  const [settings, setSettings] = useState<TournamentSettings>(INITIAL_SETTINGS)
  const [teams, setTeams] = useState<Team[]>([])
  const [schedulingConfig, setSchedulingConfig] = useState<SchedulingConfig>(INITIAL_CONFIG)
  const [schedule, setSchedule] = useState<GeneratedSchedule | null>(null)
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null)

  const isWizardActive = currentStep > 0

  const handleStartNew = () => {
    setCurrentStep(1)
    setSettings(INITIAL_SETTINGS)
    setTeams([])
    setSchedulingConfig(INITIAL_CONFIG)
    setSchedule(null)
    setCurrentTournamentId(null)
  }

  const handleStep1Complete = (data: TournamentSettings) => {
    setSettings(data)
    setCurrentStep(2)
  }

  const handleStep2Complete = (data: Team[]) => {
    setTeams(data)
    setCurrentStep(3)
  }

  const handleStep3Complete = (config: SchedulingConfig) => {
    setSchedulingConfig(config)
    const generatedSchedule = generateSchedule(settings, teams, config)
    setSchedule(generatedSchedule)
    setCurrentStep(4)
  }

  const handleSaveTournament = () => {
    if (!schedule) return

    const tournament: Tournament = {
      id: currentTournamentId || uuidv4(),
      settings,
      teams,
      schedulingConfig,
      schedule,
      createdAt: currentTournamentId 
        ? (tournaments || []).find(t => t.id === currentTournamentId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTournaments((current) => {
      const currentList = current || []
      const existing = currentList.findIndex(t => t.id === tournament.id)
      if (existing >= 0) {
        const updated = [...currentList]
        updated[existing] = tournament
        return updated
      }
      return [...currentList, tournament]
    })

    setCurrentTournamentId(tournament.id)
    toast.success('Tournament saved successfully!')
    setCurrentStep(0)
  }

  const handleLoadTournament = (tournament: Tournament) => {
    setSettings(tournament.settings)
    setTeams(tournament.teams)
    setSchedulingConfig(tournament.schedulingConfig)
    setSchedule(tournament.schedule || null)
    setCurrentTournamentId(tournament.id)
    setCurrentStep(tournament.schedule ? 4 : 1)
  }

  const handleDeleteTournament = (id: string) => {
    setTournamentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (tournamentToDelete) {
      setTournaments((current) => (current || []).filter(t => t.id !== tournamentToDelete))
      toast.success('Tournament deleted')
      setDeleteDialogOpen(false)
      setTournamentToDelete(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (!isWizardActive) {
    const tournamentList = tournaments || []
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Toaster />
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="text-center mb-12">
            <h1 
              className="text-5xl font-bold mb-4 tracking-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Football Tournament Program Builder
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create professional match schedules across multiple pitches with automatic time allocation and conflict detection
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <Button onClick={handleStartNew} size="lg" className="gap-2 text-lg px-8 py-6">
              <Plus size={24} weight="bold" />
              Create New Tournament
            </Button>
          </div>

          {tournamentList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle style={{ fontFamily: 'var(--font-heading)' }}>
                  Saved Tournaments
                </CardTitle>
                <CardDescription>
                  Load a previous tournament to view or modify
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tournamentList.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => handleLoadTournament(tournament)}
                      >
                        <div className="flex items-start gap-3">
                          <CalendarBlank size={24} className="text-primary mt-1" />
                          <div>
                            <h3 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
                              {tournament.settings.name || 'Unnamed Tournament'}
                            </h3>
                            <div className="text-sm text-muted-foreground mt-1 space-y-1">
                              <p>
                                {tournament.teams.length} teams • {tournament.schedule?.matches.length || 0} matches • {tournament.settings.numPitches} pitch{tournament.settings.numPitches !== 1 ? 'es' : ''}
                              </p>
                              <p>
                                {formatDate(tournament.settings.startDate)} at {tournament.settings.startTime}
                              </p>
                              <p className="text-xs">
                                Last updated: {formatDate(tournament.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteTournament(tournament.id)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash size={20} />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Tournament</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this tournament? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Toaster />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 
            className="text-3xl font-bold mb-2 text-center"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Football Tournament Program Builder
          </h1>
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        {currentStep === 1 && (
          <Step1TournamentSettings
            initialData={settings}
            onNext={handleStep1Complete}
          />
        )}

        {currentStep === 2 && (
          <Step2Teams
            initialTeams={teams}
            onNext={handleStep2Complete}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3SchedulingMode
            initialConfig={schedulingConfig}
            teamCount={teams.length}
            onNext={handleStep3Complete}
            onBack={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 4 && schedule && (
          <Step4Schedule
            schedule={schedule}
            tournamentName={settings.name}
            teams={teams}
            onBack={() => setCurrentStep(3)}
            onSave={handleSaveTournament}
          />
        )}
      </div>
    </div>
  )
}

export default App