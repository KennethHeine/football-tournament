import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SchedulingConfig, SchedulingMode, Team } from '@/lib/types'
import { ArrowRight, ArrowLeft, Plus, Trash } from '@phosphor-icons/react'

interface Step3Props {
  initialConfig: SchedulingConfig
  teamCount: number
  teams: Team[]
  onNext: (config: SchedulingConfig) => void
  onBack: () => void
}

export function Step3SchedulingMode({
  initialConfig,
  teamCount,
  teams,
  onNext,
  onBack,
}: Step3Props) {
  const [mode, setMode] = useState<SchedulingMode>(initialConfig.mode)
  const [maxMatchesPerTeam, setMaxMatchesPerTeam] = useState(initialConfig.maxMatchesPerTeam || 3)
  const [maxTotalMatches, setMaxTotalMatches] = useState(initialConfig.maxTotalMatches || undefined)
  const [excludedMatchups, setExcludedMatchups] = useState<[string, string][]>(
    initialConfig.excludedMatchups || []
  )
  const [excludeTeam1, setExcludeTeam1] = useState<string>('')
  const [excludeTeam2, setExcludeTeam2] = useState<string>('')
  const [error, setError] = useState('')

  const handleNext = () => {
    if (mode === 'limited-matches') {
      if (!maxMatchesPerTeam || maxMatchesPerTeam < 1) {
        setError('Maks kampe pr. hold skal være mindst 1')
        return
      }

      if (maxTotalMatches !== undefined && maxTotalMatches < 1) {
        setError('Maks totale kampe skal være mindst 1')
        return
      }
    }

    const config: SchedulingConfig = {
      mode,
      ...(mode === 'limited-matches' && {
        maxMatchesPerTeam,
        maxTotalMatches: maxTotalMatches || undefined,
        excludedMatchups: excludedMatchups.length > 0 ? excludedMatchups : undefined,
      }),
    }

    onNext(config)
  }

  const addExcludedMatchup = () => {
    if (!excludeTeam1 || !excludeTeam2) return
    if (excludeTeam1 === excludeTeam2) {
      setError('Vælg to forskellige hold')
      return
    }

    const pairKey = [excludeTeam1, excludeTeam2].sort().join('-')
    const alreadyExcluded = excludedMatchups.some(([a, b]) => [a, b].sort().join('-') === pairKey)

    if (alreadyExcluded) {
      setError('Denne parring er allerede udelukket')
      return
    }

    setExcludedMatchups([...excludedMatchups, [excludeTeam1, excludeTeam2]])
    setExcludeTeam1('')
    setExcludeTeam2('')
    setError('')
  }

  const removeExcludedMatchup = (index: number) => {
    setExcludedMatchups(excludedMatchups.filter((_, i) => i !== index))
  }

  const getTeamName = (id: string) => {
    return teams.find(t => t.id === id)?.name || id
  }

  const maxPossibleOpponents = teamCount - 1
  const roundRobinMatches = (teamCount * (teamCount - 1)) / 2

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
          Planlægningstilstand
        </CardTitle>
        <CardDescription>Vælg hvordan kampe skal planlægges for {teamCount} hold</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <RadioGroup value={mode} onValueChange={value => setMode(value as SchedulingMode)}>
            <div className="space-y-4">
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  mode === 'round-robin'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setMode('round-robin')}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="round-robin" id="round-robin" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="round-robin" className="text-base font-semibold cursor-pointer">
                      Alle spiller mod alle (Puljespil)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Klassisk turneringsformat hvor hvert hold spiller mod hvert andet hold én gang
                    </p>
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">
                        Totale kampe:{' '}
                        <span className="text-primary font-bold">{roundRobinMatches}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hvert hold spiller {maxPossibleOpponents} kamp
                        {maxPossibleOpponents !== 1 ? 'e' : ''}
                        {teamCount % 2 !== 0 && ' (1 hold sidder over i hver runde)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  mode === 'limited-matches'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setMode('limited-matches')}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="limited-matches" id="limited-matches" className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor="limited-matches"
                      className="text-base font-semibold cursor-pointer"
                    >
                      Begræns antal kampe
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sæt et maksimalt antal kampe pr. hold eller for hele turneringen
                    </p>

                    {mode === 'limited-matches' && (
                      <div className="mt-4 space-y-4 animate-fadeIn">
                        <div className="space-y-2">
                          <Label htmlFor="maxMatchesPerTeam">Maks kampe pr. hold *</Label>
                          <Input
                            id="maxMatchesPerTeam"
                            type="number"
                            min="1"
                            max={maxPossibleOpponents}
                            value={maxMatchesPerTeam}
                            onChange={e => setMaxMatchesPerTeam(Number(e.target.value))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Maksimum: {maxPossibleOpponents} (unikke modstandere tilgængelige)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="maxTotalMatches">Maks totale kampe (valgfri)</Label>
                          <Input
                            id="maxTotalMatches"
                            type="number"
                            min="1"
                            placeholder="Lad stå tom for ingen grænse"
                            value={maxTotalMatches || ''}
                            onChange={e =>
                              setMaxTotalMatches(
                                e.target.value ? Number(e.target.value) : undefined
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Begræns yderligere det totale antal kampe i turneringen
                          </p>
                        </div>

                        {maxMatchesPerTeam > maxPossibleOpponents && (
                          <div className="p-3 bg-accent/20 border border-accent rounded-md">
                            <p className="text-sm font-medium text-accent-foreground">
                              ⚠️ Maks kampe pr. hold ({maxMatchesPerTeam}) overstiger unikke
                              modstandere ({maxPossibleOpponents})
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Nogle hold vil spille mod hinanden flere gange
                            </p>
                          </div>
                        )}

                        <div className="space-y-3 border-t pt-4">
                          <Label className="text-base font-medium">Udeluk holdpar (valgfri)</Label>
                          <p className="text-xs text-muted-foreground">
                            Vælg hold der ikke skal spille mod hinanden
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Select value={excludeTeam1} onValueChange={setExcludeTeam1}>
                              <SelectTrigger className="min-h-11 flex-1">
                                <SelectValue placeholder="Vælg hold 1" />
                              </SelectTrigger>
                              <SelectContent>
                                {teams.map(team => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={excludeTeam2} onValueChange={setExcludeTeam2}>
                              <SelectTrigger className="min-h-11 flex-1">
                                <SelectValue placeholder="Vælg hold 2" />
                              </SelectTrigger>
                              <SelectContent>
                                {teams
                                  .filter(t => t.id !== excludeTeam1)
                                  .map(team => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>

                            <Button
                              onClick={addExcludedMatchup}
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="gap-1 min-h-11"
                              disabled={!excludeTeam1 || !excludeTeam2}
                            >
                              <Plus size={16} /> Tilføj
                            </Button>
                          </div>

                          {excludedMatchups.length > 0 && (
                            <div className="space-y-2">
                              {excludedMatchups.map(([a, b], idx) => (
                                <div
                                  key={`${a}-${b}`}
                                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                                >
                                  <span className="text-sm font-medium">
                                    {getTeamName(a)} ↔ {getTeamName(b)}
                                  </span>
                                  <Button
                                    onClick={() => removeExcludedMatchup(idx)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                  >
                                    <Trash size={16} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg text-sm text-destructive animate-shake">
              {error}
            </div>
          )}

          {/* Mobile-friendly sticky bottom navigation */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between pt-4 sticky bottom-0 bg-card pb-2 -mx-6 px-6 border-t sm:border-t-0 sm:static sm:bg-transparent sm:pb-0">
            <Button
              onClick={onBack}
              variant="outline"
              size="lg"
              className="gap-2 w-full sm:w-auto order-2 sm:order-1 min-h-12"
            >
              <ArrowLeft size={20} /> Tilbage
            </Button>
            <Button
              onClick={handleNext}
              size="lg"
              className="gap-2 w-full sm:w-auto order-1 sm:order-2 min-h-12"
            >
              Generer Skema <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
