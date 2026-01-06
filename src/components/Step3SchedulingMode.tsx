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
        setError('Max matches per team must be at least 1')
        return
      }
      
      if (maxTotalMatches !== undefined && maxTotalMatches < 1) {
        setError('Max total matches must be at least 1')
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
        <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>Scheduling Mode</CardTitle>
        <CardDescription>Choose how matches should be scheduled for {teamCount} teams</CardDescription>
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
                      Everyone plays everyone (Round-robin)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Classic tournament format where each team plays every other team once
                    </p>
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">
                        Total matches: <span className="text-primary font-bold">{roundRobinMatches}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Each team plays {maxPossibleOpponents} match{maxPossibleOpponents !== 1 ? 'es' : ''}
                        {teamCount % 2 !== 0 && ' (BYE team will be added)'}
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
                      Limit number of matches
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set a maximum number of matches per team or for the entire tournament
                    </p>
                    
                    {mode === 'limited-matches' && (
                      <div className="mt-4 space-y-4 animate-fadeIn">
                        <div className="space-y-2">
                          <Label htmlFor="maxMatchesPerTeam">
                            Max matches per team *
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
                            Maximum: {maxPossibleOpponents} (unique opponents available)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="maxTotalMatches">
                            Max total matches (optional)
                          </Label>
                          <Input
                            id="maxTotalMatches"
                            type="number"
                            min="1"
                            placeholder="Leave empty for no limit"
                            value={maxTotalMatches || ''}
                            onChange={(e) => setMaxTotalMatches(e.target.value ? Number(e.target.value) : undefined)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Further limit the total number of matches in the tournament
                          </p>
                        </div>

                        {maxMatchesPerTeam > maxPossibleOpponents && (
                          <div className="p-3 bg-accent/20 border border-accent rounded-md">
                            <p className="text-sm font-medium text-accent-foreground">
                              ⚠️ Max matches per team ({maxMatchesPerTeam}) exceeds unique opponents ({maxPossibleOpponents})
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Some teams will play each other multiple times
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
              <ArrowLeft size={20} /> Back
            </Button>
            <Button onClick={handleNext} size="lg" className="gap-2">
              Generate Schedule <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
