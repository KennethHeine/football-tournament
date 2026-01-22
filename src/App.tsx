import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Stepper } from '@/components/Stepper'
import { Step1TournamentSettings } from '@/components/Step1TournamentSettings'
import { Step2Teams } from '@/components/Step2Teams'
import { Step3SchedulingMode } from '@/components/Step3SchedulingMode'
import { Step4Schedule } from '@/components/Step4Schedule'
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt'
import type {
  Tournament,
  TournamentSettings,
  Team,
  SchedulingConfig,
  GeneratedSchedule,
} from '@/lib/types'
import { generateSchedule } from '@/lib/scheduler'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus,
  Trash,
  CalendarBlank,
  Copy,
  SoccerBall,
  Timer,
  ListChecks,
  Export,
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

const INITIAL_SETTINGS: TournamentSettings = {
  name: '',
  startDate: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  numPitches: 2,
  pitchNames: ['Bane 1', 'Bane 2'],
  matchMode: 'full-time',
  matchDurationMinutes: 30,
  breakBetweenMatches: 5,
}

const INITIAL_CONFIG: SchedulingConfig = {
  mode: 'round-robin',
}

const UNNAMED_TOURNAMENT = 'Unavngivet Turnering'

const steps = [
  { number: 1, title: 'Turnerings Opsætning' },
  { number: 2, title: 'Tilføj Hold' },
  { number: 3, title: 'Planlægnings Tilstand' },
  { number: 4, title: 'Generer & Se' },
]

function App() {
  const [tournaments, setTournaments] = useLocalStorage<Tournament[]>('tournaments', [])
  const [currentStep, setCurrentStep] = useState(0)
  const [settings, setSettings] = useState<TournamentSettings>(INITIAL_SETTINGS)
  const [teams, setTeams] = useState<Team[]>([])
  const [schedulingConfig, setSchedulingConfig] = useState<SchedulingConfig>(INITIAL_CONFIG)
  const [schedule, setSchedule] = useState<GeneratedSchedule | null>(null)
  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [tournamentToDelete, setTournamentToDelete] = useState<string | null>(null)

  const isWizardActive = currentStep > 0

  const updateURL = useCallback((tournamentId: string | null, step: number) => {
    const params = new URLSearchParams()

    if (tournamentId) {
      params.set('tournament', tournamentId)
    }

    if (step > 0) {
      params.set('step', step.toString())
    }

    const newURL = params.toString() ? `?${params.toString()}` : '/'
    window.history.pushState({ tournamentId, step }, '', newURL)
  }, [])

  const handlePopState = useCallback(
    (_event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search)
      const tournamentId = params.get('tournament')
      const step = parseInt(params.get('step') || '0')

      if (tournamentId && (tournaments || []).length > 0) {
        const tournament = (tournaments || []).find(t => t.id === tournamentId)
        if (tournament) {
          setSettings(tournament.settings)
          setTeams(tournament.teams)
          setSchedulingConfig(tournament.schedulingConfig)

          if (tournament.schedule) {
            const rehydratedSchedule: GeneratedSchedule = {
              ...tournament.schedule,
              matches: tournament.schedule.matches.map(match => ({
                ...match,
                startTime: new Date(match.startTime),
                endTime: new Date(match.endTime),
              })),
              conflicts: tournament.schedule.conflicts.map(conflict => ({
                ...conflict,
                matches: conflict.matches.map(match => ({
                  ...match,
                  startTime: new Date(match.startTime),
                  endTime: new Date(match.endTime),
                })),
              })),
            }
            setSchedule(rehydratedSchedule)
          } else {
            setSchedule(null)
          }

          setCurrentTournamentId(tournament.id)
          setCurrentStep(step || (tournament.schedule ? 4 : 1))
        } else {
          setCurrentStep(0)
          setCurrentTournamentId(null)
        }
      } else {
        setCurrentStep(step)
        if (step === 0) {
          setCurrentTournamentId(null)
        }
      }
    },
    [tournaments]
  )

  useEffect(() => {
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handlePopState])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tournamentId = params.get('tournament')
    const step = parseInt(params.get('step') || '0')

    if (tournamentId && (tournaments || []).length > 0) {
      const tournament = (tournaments || []).find(t => t.id === tournamentId)
      if (tournament) {
        setSettings(tournament.settings)
        setTeams(tournament.teams)
        setSchedulingConfig(tournament.schedulingConfig)

        if (tournament.schedule) {
          const rehydratedSchedule: GeneratedSchedule = {
            ...tournament.schedule,
            matches: tournament.schedule.matches.map(match => ({
              ...match,
              startTime: new Date(match.startTime),
              endTime: new Date(match.endTime),
            })),
            conflicts: tournament.schedule.conflicts.map(conflict => ({
              ...conflict,
              matches: conflict.matches.map(match => ({
                ...match,
                startTime: new Date(match.startTime),
                endTime: new Date(match.endTime),
              })),
            })),
          }
          setSchedule(rehydratedSchedule)
        } else {
          setSchedule(null)
        }

        setCurrentTournamentId(tournament.id)
        setCurrentStep(step || (tournament.schedule ? 4 : 1))
      }
    } else if (step > 0) {
      setCurrentStep(step)
    }
    // Run once on initial mount to restore state from URL - intentionally no dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStartNew = () => {
    setCurrentStep(1)
    setSettings(INITIAL_SETTINGS)
    setTeams([])
    setSchedulingConfig(INITIAL_CONFIG)
    setSchedule(null)
    setCurrentTournamentId(null)
    updateURL(null, 1)
  }

  const handleStep1Complete = (data: TournamentSettings) => {
    setSettings(data)
    setCurrentStep(2)
    updateURL(currentTournamentId, 2)
  }

  const handleStep2Complete = (data: Team[]) => {
    setTeams(data)
    setCurrentStep(3)
    updateURL(currentTournamentId, 3)
  }

  const handleStep3Complete = (config: SchedulingConfig) => {
    setSchedulingConfig(config)
    const generatedSchedule = generateSchedule(settings, teams, config)
    setSchedule(generatedSchedule)
    setCurrentStep(4)
    updateURL(currentTournamentId, 4)
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
        ? (tournaments || []).find(t => t.id === currentTournamentId)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTournaments(current => {
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
    toast.success('Turnering gemt!')
    setCurrentStep(0)
    updateURL(null, 0)
  }

  const handleLoadTournament = (tournament: Tournament, shouldUpdateURL = true) => {
    setSettings(tournament.settings)
    setTeams(tournament.teams)
    setSchedulingConfig(tournament.schedulingConfig)

    if (tournament.schedule) {
      const rehydratedSchedule: GeneratedSchedule = {
        ...tournament.schedule,
        matches: tournament.schedule.matches.map(match => ({
          ...match,
          startTime: new Date(match.startTime),
          endTime: new Date(match.endTime),
        })),
        conflicts: tournament.schedule.conflicts.map(conflict => ({
          ...conflict,
          matches: conflict.matches.map(match => ({
            ...match,
            startTime: new Date(match.startTime),
            endTime: new Date(match.endTime),
          })),
        })),
      }
      setSchedule(rehydratedSchedule)
    } else {
      setSchedule(null)
    }

    setCurrentTournamentId(tournament.id)
    const step = tournament.schedule ? 4 : 1
    setCurrentStep(step)

    if (shouldUpdateURL) {
      updateURL(tournament.id, step)
    }
  }

  const handleDeleteTournament = (id: string) => {
    setTournamentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (tournamentToDelete) {
      setTournaments(current => (current || []).filter(t => t.id !== tournamentToDelete))
      toast.success('Turnering slettet')
      setDeleteDialogOpen(false)
      setTournamentToDelete(null)
    }
  }

  const handleCopyTournament = (tournament: Tournament) => {
    const copiedTournament: Tournament = {
      ...tournament,
      id: uuidv4(),
      settings: {
        ...tournament.settings,
        name: `${tournament.settings.name || UNNAMED_TOURNAMENT} (Kopi)`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTournaments(current => [...(current || []), copiedTournament])
    toast.success('Turnering kopieret')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (!isWizardActive) {
    const tournamentList = tournaments || []

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <Toaster />
        <PWAUpdatePrompt />
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <SoccerBall size={48} weight="duotone" className="text-primary" />
            </div>
            <h1
              className="text-5xl md:text-6xl font-bold tracking-tight mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Fodboldturnering
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Opret kampskemaer til din næste turnering på få minutter
            </p>
            <Button
              onClick={handleStartNew}
              size="lg"
              className="gap-2 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Plus size={24} weight="bold" />
              Opret Ny Turnering
            </Button>
          </div>

          {/* Feature Highlights */}
          {tournamentList.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Timer size={24} className="text-primary" />
                </div>
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Hurtig Opsætning
                </h3>
                <p className="text-muted-foreground text-sm">
                  Fra start til færdigt kampskema på under 2 minutter med vores intuitive guide.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <ListChecks size={24} className="text-primary" />
                </div>
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Smart Planlægning
                </h3>
                <p className="text-muted-foreground text-sm">
                  Automatisk fordeling af kampe på tværs af baner med optimeret hviletid.
                </p>
              </div>
              <div className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Export size={24} className="text-primary" />
                </div>
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Nem Eksport
                </h3>
                <p className="text-muted-foreground text-sm">
                  Eksporter til print, CSV eller billede. Del nemt med alle deltagere.
                </p>
              </div>
            </div>
          )}

          {tournamentList.length > 0 && (
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl" style={{ fontFamily: 'var(--font-heading)' }}>
                  Gemte Turneringer
                </CardTitle>
                <CardDescription>
                  Indlæs en tidligere turnering for at se eller redigere
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tournamentList.map(tournament => (
                    <div
                      key={tournament.id}
                      className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group"
                      onClick={() => handleLoadTournament(tournament)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <CalendarBlank size={24} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-semibold text-lg truncate"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            {tournament.settings.name || UNNAMED_TOURNAMENT}
                          </h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                            <span>{tournament.teams.length} hold</span>
                            <span>•</span>
                            <span>{tournament.schedule?.matches.length || 0} kampe</span>
                            <span>•</span>
                            <span>
                              {tournament.settings.numPitches} ban
                              {tournament.settings.numPitches !== 1 ? 'er' : 'e'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(tournament.settings.startDate)} kl.{' '}
                            {tournament.settings.startTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={e => {
                            e.stopPropagation()
                            handleCopyTournament(tournament)
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Copy size={18} />
                        </Button>
                        <Button
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteTournament(tournament.id)
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto py-8 text-center text-sm text-muted-foreground border-t border-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex items-center justify-center gap-2 mb-3">
              <SoccerBall size={16} weight="duotone" className="text-primary" />
              <span style={{ fontFamily: 'var(--font-heading)' }} className="font-semibold">
                Fodboldturnering
              </span>
            </div>
            <p className="mb-4 text-muted-foreground/80">
              Et gratis værktøj til alle frivillige fodboldtrænere, der ønsker at lave kampskemaer
              til stævner og turneringer – hurtigt og nemt.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs">
              <span>Lavet af</span>
              <a
                href="https://kennethheine.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <img src="/ks-logo.svg" alt="Kenneth Heine logo" className="w-4 h-4" />
                Kenneth Heine
              </a>
            </div>
          </div>
        </footer>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Slet Turnering</DialogTitle>
              <DialogDescription>
                Er du sikker på, at du vil slette denne turnering? Denne handling kan ikke
                fortrydes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Annuller
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Slet
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
      <PWAUpdatePrompt />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <SoccerBall size={32} weight="duotone" className="text-primary" />
            <h1
              className="text-3xl font-bold text-center"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Fodboldturnering
            </h1>
          </div>
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        {currentStep === 1 && (
          <Step1TournamentSettings
            initialData={settings}
            onNext={handleStep1Complete}
            onBack={() => {
              setCurrentStep(0)
              updateURL(null, 0)
            }}
          />
        )}

        {currentStep === 2 && (
          <Step2Teams
            initialTeams={teams}
            onNext={handleStep2Complete}
            onBack={() => {
              setCurrentStep(1)
              updateURL(currentTournamentId, 1)
            }}
          />
        )}

        {currentStep === 3 && (
          <Step3SchedulingMode
            initialConfig={schedulingConfig}
            teamCount={teams.length}
            onNext={handleStep3Complete}
            onBack={() => {
              setCurrentStep(2)
              updateURL(currentTournamentId, 2)
            }}
          />
        )}

        {currentStep === 4 && schedule && (
          <Step4Schedule
            schedule={schedule}
            tournamentName={settings.name}
            teams={teams}
            settings={settings}
            onBack={() => {
              setCurrentStep(3)
              updateURL(currentTournamentId, 3)
            }}
            onSave={handleSaveTournament}
          />
        )}
      </div>
    </div>
  )
}

export default App
