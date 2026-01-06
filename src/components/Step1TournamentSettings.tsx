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

const tournamentSettingsSchema = z.object({
  name: z.string(),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  numPitches: z.coerce.number().int().min(1, 'At least 1 pitch required'),
  matchMode: z.enum(['full-time', 'two-halves']),
  matchDurationMinutes: z.coerce.number().int().min(5, 'Minimum 5 minutes').optional(),
  halfDurationMinutes: z.coerce.number().int().min(3, 'Minimum 3 minutes').optional(),
  halftimeBreakMinutes: z.coerce.number().int().min(0, 'Cannot be negative').optional(),
  breakBetweenMatches: z.coerce.number().int().min(0, 'Cannot be negative'),
}).refine((data) => {
  if (data.matchMode === 'full-time') {
    return data.matchDurationMinutes !== undefined && data.matchDurationMinutes >= 5
  }
  return true
}, {
  message: 'Match duration required for full-time mode',
  path: ['matchDurationMinutes']
}).refine((data) => {
  if (data.matchMode === 'two-halves') {
    return data.halfDurationMinutes !== undefined && data.halfDurationMinutes >= 3
  }
  return true
}, {
  message: 'Half duration required for two-halves mode',
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

  const onSubmit = (data: TournamentSettings) => {
    onNext(data)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>Tournament Settings</CardTitle>
        <CardDescription>Configure your tournament's basic information and timing</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name (Optional)</Label>
              <Input
                id="name"
                placeholder="e.g., Summer Cup 2024"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
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
                <Label htmlFor="startTime">Start Time *</Label>
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
              <Label htmlFor="numPitches">Number of Pitches/Fields *</Label>
              <Input
                id="numPitches"
                type="number"
                min="1"
                placeholder="e.g., 2"
                {...register('numPitches')}
              />
              {errors.numPitches && (
                <p className="text-sm text-destructive">{errors.numPitches.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchMode">Match Mode *</Label>
              <Select
                value={matchMode}
                onValueChange={(value) => setValue('matchMode', value as MatchMode)}
              >
                <SelectTrigger id="matchMode">
                  <SelectValue placeholder="Select match mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full time only (continuous match)</SelectItem>
                  <SelectItem value="two-halves">Two halves (with halftime break)</SelectItem>
                </SelectContent>
              </Select>
              {errors.matchMode && (
                <p className="text-sm text-destructive">{errors.matchMode.message}</p>
              )}
            </div>

            {matchMode === 'full-time' && (
              <div className="space-y-2 animate-fadeIn">
                <Label htmlFor="matchDurationMinutes">Match Duration (minutes) *</Label>
                <Input
                  id="matchDurationMinutes"
                  type="number"
                  min="5"
                  placeholder="e.g., 30"
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
                    <Label htmlFor="halfDurationMinutes">Half Duration (minutes) *</Label>
                    <Input
                      id="halfDurationMinutes"
                      type="number"
                      min="3"
                      placeholder="e.g., 15"
                      {...register('halfDurationMinutes')}
                    />
                    {errors.halfDurationMinutes && (
                      <p className="text-sm text-destructive">{errors.halfDurationMinutes.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="halftimeBreakMinutes">Halftime Break (minutes) *</Label>
                    <Input
                      id="halftimeBreakMinutes"
                      type="number"
                      min="0"
                      placeholder="e.g., 5"
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
              <Label htmlFor="breakBetweenMatches">Break Between Matches (minutes) *</Label>
              <Input
                id="breakBetweenMatches"
                type="number"
                min="0"
                placeholder="e.g., 5"
                {...register('breakBetweenMatches')}
              />
              <p className="text-xs text-muted-foreground">Time allocated for teams to switch on the same pitch</p>
              {errors.breakBetweenMatches && (
                <p className="text-sm text-destructive">{errors.breakBetweenMatches.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" className="gap-2">
              Next <ArrowRight size={20} />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
