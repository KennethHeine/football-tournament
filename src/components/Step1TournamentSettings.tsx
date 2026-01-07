import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TournamentSettings, MatchMode } from '@/lib/types'
import { ArrowRight } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'

const tournamentSettingsSchema = z.object({
  name: z.string(),
  startDate: z.string().min(1, 'Startdato er påkrævet'),
  startTime: z.string().min(1, 'Starttidspunkt er påkrævet'),
  numPitches: z.coerce.number().int().min(1, 'Mindst 1 bane påkrævet'),
  matchMode: z.enum(['full-time', 'two-halves']),
  matchDurationMinutes: z.coerce.number().int().min(5, 'Minimum 5 minutter').optional(),
  halfDurationMinutes: z.coerce.number().int().min(3, 'Minimum 3 minutter').optional(),
  halftimeBreakMinutes: z.coerce.number().int().min(0, 'Kan ikke være negativ').optional(),
  breakBetweenMatches: z.coerce.number().int().min(0, 'Kan ikke være negativ'),
}).refine((data) => {
  if (data.matchMode === 'full-time') {
    return data.matchDurationMinutes !== undefined && data.matchDurationMinutes >= 5
  }
  return true
}, {
  message: 'Kampvarighed påkrævet for fuldtidstilstand',
  path: ['matchDurationMinutes']
}).refine((data) => {
  if (data.matchMode === 'two-halves') {
    return data.halfDurationMinutes !== undefined && data.halfDurationMinutes >= 3
  }
  return true
}, {
  message: 'Halvlegvarighed påkrævet for to halvlege tilstand',
  path: ['halfDurationMinutes']
})

interface Step1Props {
  initialData: TournamentSettings
  onNext: (data: TournamentSettings) => void
}

export function Step1TournamentSettings({ initialData, onNext }: Step1Props) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TournamentSettings>({
    resolver: zodResolver(tournamentSettingsSchema),
    defaultValues: initialData
  })

  const matchMode = watch('matchMode')
  const numPitches = watch('numPitches')
  const [pitchNames, setPitchNames] = useState<string[]>(
    initialData.pitchNames || Array.from({ length: initialData.numPitches }, (_, i) => `Bane ${i + 1}`)
  )

  useEffect(() => {
    const currentNum = Number(numPitches) || 1
    setPitchNames((current) => {
      const newNames = [...current]
      if (newNames.length < currentNum) {
        for (let i = newNames.length; i < currentNum; i++) {
          newNames.push(`Bane ${i + 1}`)
        }
      } else if (newNames.length > currentNum) {
        newNames.splice(currentNum)
      }
      return newNames
    })
  }, [numPitches])

  const handlePitchNameChange = (index: number, name: string) => {
    setPitchNames((current) => {
      const updated = [...current]
      updated[index] = name
      return updated
    })
  }

  const onSubmit = (data: TournamentSettings) => {
    onNext({ ...data, pitchNames })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>Turneringsindstillinger</CardTitle>
        <CardDescription>Konfigurer din turnerings grundlæggende information og timing</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Turneringsnavn (Valgfri)</Label>
              <Input
                id="name"
                placeholder="f.eks. Sommer Cup 2024"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Startdato *</Label>
                <Input
                  id="startDate"
                  type="date"
                  min={today}
                  {...register('startDate')}
                />
                {errors.startDate && (
                  <p className="text-sm text-destructive">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Starttidspunkt *</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register('startTime')}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">{errors.startTime.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numPitches">Antal Baner *</Label>
              <Input
                id="numPitches"
                type="number"
                min="1"
                placeholder="f.eks. 2"
                {...register('numPitches')}
              />
              {errors.numPitches && (
                <p className="text-sm text-destructive">{errors.numPitches.message}</p>
              )}
            </div>

            {numPitches && Number(numPitches) > 0 && (
              <div className="space-y-3 animate-fadeIn">
                <Label>Banenavne (Valgfri)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pitchNames.map((name, index) => (
                    <div key={index} className="space-y-1.5">
                      <Label htmlFor={`pitch-${index}`} className="text-xs text-muted-foreground">
                        Bane {index + 1}
                      </Label>
                      <Input
                        id={`pitch-${index}`}
                        value={name}
                        onChange={(e) => handlePitchNameChange(index, e.target.value)}
                        placeholder={`Bane ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Giv hver bane et specifikt navn (f.eks. "Hovedbane", "Træningsbane A")
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="matchMode">Kamptilstand *</Label>
              <Select
                value={matchMode}
                onValueChange={(value) => setValue('matchMode', value as MatchMode)}
              >
                <SelectTrigger id="matchMode">
                  <SelectValue placeholder="Vælg kamptilstand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Fuldtid (kontinuerlig kamp)</SelectItem>
                  <SelectItem value="two-halves">To halvlege (med pause)</SelectItem>
                </SelectContent>
              </Select>
              {errors.matchMode && (
                <p className="text-sm text-destructive">{errors.matchMode.message}</p>
              )}
            </div>

            {matchMode === 'full-time' && (
              <div className="space-y-2 animate-fadeIn">
                <Label htmlFor="matchDurationMinutes">Kampvarighed (minutter) *</Label>
                <Input
                  id="matchDurationMinutes"
                  type="number"
                  min="5"
                  placeholder="f.eks. 30"
                  {...register('matchDurationMinutes')}
                />
                {errors.matchDurationMinutes && (
                  <p className="text-sm text-destructive">{errors.matchDurationMinutes.message}</p>
                )}
              </div>
            )}

            {matchMode === 'two-halves' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="halfDurationMinutes">Halvlegvarighed (minutter) *</Label>
                    <Input
                      id="halfDurationMinutes"
                      type="number"
                      min="3"
                      placeholder="f.eks. 15"
                      {...register('halfDurationMinutes')}
                    />
                    {errors.halfDurationMinutes && (
                      <p className="text-sm text-destructive">{errors.halfDurationMinutes.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="halftimeBreakMinutes">Pauselængde (minutter) *</Label>
                    <Input
                      id="halftimeBreakMinutes"
                      type="number"
                      min="0"
                      placeholder="f.eks. 5"
                      {...register('halftimeBreakMinutes')}
                    />
                    {errors.halftimeBreakMinutes && (
                      <p className="text-sm text-destructive">{errors.halftimeBreakMinutes.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="breakBetweenMatches">Pause Mellem Kampe (minutter) *</Label>
              <Input
                id="breakBetweenMatches"
                type="number"
                min="0"
                placeholder="f.eks. 5"
                {...register('breakBetweenMatches')}
              />
              <p className="text-xs text-muted-foreground">Tid afsat til hold skift på samme bane</p>
              {errors.breakBetweenMatches && (
                <p className="text-sm text-destructive">{errors.breakBetweenMatches.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" className="gap-2">
              Næste <ArrowRight size={20} />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
