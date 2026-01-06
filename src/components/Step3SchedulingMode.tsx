import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { SchedulingConfig, SchedulingMode } from '@/lib/types'
import { ArrowRight, ArrowLeft, Users } from '@phosphor-icons/react'

interface Step3Props {
  initialConfig: SchedulingConfig
  teamCount: number
  onNext: (config: SchedulingConfig) => void
  onBack: () => void
}

export function Step3SchedulingMode({ initialConfig, teamCount, onNext, onBack }: Step3Props) {
  const [mode, setMode] = useState<SchedulingMode>(initialConfig.mode)
  const [maxMatchesPerTeam, setMaxMatchesPerTeam] = useState(initialConfig.maxMatchesPerTeam || 3)
  const [maxTotalMatches, setMaxTotalMatches] = useState(initialConfig.maxTotalMatches || undefined)
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
        maxTotalMatches: maxTotalMatches || undefined
      })
    }

    onNext(config)
  }

  const maxPossibleOpponents = teamCount - 1
  const roundRobinMatches = teamCount % 2 === 0 
    ? (teamCount * (teamCount - 1)) / 2 
    : ((teamCount + 1) * teamCount) / 2

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>Planlægningstilstand</CardTitle>
        <CardDescription>Vælg hvordan kampe skal planlægges for {teamCount} hold</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as SchedulingMode)}>
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
                        Totale kampe: <span className="text-primary font-bold">{roundRobinMatches}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hvert hold spiller {maxPossibleOpponents} kamp{maxPossibleOpponents !== 1 ? 'e' : ''}
                        {teamCount % 2 !== 0 && ' (BYE hold vil blive tilføjet)'}
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
                    <Label htmlFor="limited-matches" className="text-base font-semibold cursor-pointer">
                      Begræns antal kampe
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Sæt et maksimalt antal kampe pr. hold eller for hele turneringen
                    </p>
                    
                    {mode === 'limited-matches' && (
                      <div className="mt-4 space-y-4 animate-fadeIn">
                        <div className="space-y-2">
                          <Label htmlFor="maxMatchesPerTeam">
                            Maks kampe pr. hold *
                          </Label>
                          <Input
                            id="maxMatchesPerTeam"
                            type="number"
                            min="1"
                            max={maxPossibleOpponents}
                            value={maxMatchesPerTeam}
                            onChange={(e) => setMaxMatchesPerTeam(Number(e.target.value))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Maksimum: {maxPossibleOpponents} (unikke modstandere tilgængelige)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="maxTotalMatches">
                            Maks totale kampe (valgfri)
                          </Label>
                          <Input
                            id="maxTotalMatches"
                            type="number"
                            min="1"
                            placeholder="Lad stå tom for ingen grænse"
                            value={maxTotalMatches || ''}
                            onChange={(e) => setMaxTotalMatches(e.target.value ? Number(e.target.value) : undefined)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Begræns yderligere det totale antal kampe i turneringen
                          </p>
                        </div>

                        {maxMatchesPerTeam > maxPossibleOpponents && (
                          <div className="p-3 bg-accent/20 border border-accent rounded-md">
                            <p className="text-sm font-medium text-accent-foreground">
                              ⚠️ Maks kampe pr. hold ({maxMatchesPerTeam}) overstiger unikke modstandere ({maxPossibleOpponents})
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Nogle hold vil spille mod hinanden flere gange
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-sm text-destructive animate-shake">
              {error}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button onClick={onBack} variant="outline" size="lg" className="gap-2">
              <ArrowLeft size={20} /> Tilbage
            </Button>
            <Button onClick={handleNext} size="lg" className="gap-2">
              Generer Skema <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
