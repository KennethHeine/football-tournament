import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Team } from '@/lib/types'
import { ArrowRight, ArrowLeft, Plus, Trash, Users, WarningCircle } from '@phosphor-icons/react'
import { v4 as uuidv4 } from 'uuid'

interface Step2Props {
  initialTeams: Team[]
  onNext: (teams: Team[]) => void
  onBack: () => void
}

export function Step2Teams({ initialTeams, onNext, onBack }: Step2Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [newTeamName, setNewTeamName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [error, setError] = useState('')

  const addTeam = () => {
    const trimmedName = newTeamName.trim()
    
    if (!trimmedName) {
      setError('Holdnavn kan ikke være tomt')
      return
    }

    if (teams.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`Hold "${trimmedName}" eksisterer allerede. Prøv "${trimmedName} 2"`)
      return
    }

    setTeams([...teams, { id: uuidv4(), name: trimmedName }])
    setNewTeamName('')
    setError('')
  }

  const bulkAddTeams = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    if (lines.length === 0) {
      setError('Ingen holdnavne fundet')
      return
    }

    const newTeams: Team[] = []
    const existingNames = new Set(teams.map(t => t.name.toLowerCase()))
    const duplicatesInBulk = new Set<string>()
    const addedInBulk = new Set<string>()

    for (const name of lines) {
      const lowerName = name.toLowerCase()
      
      if (existingNames.has(lowerName) || addedInBulk.has(lowerName)) {
        duplicatesInBulk.add(name)
        continue
      }

      newTeams.push({ id: uuidv4(), name })
      addedInBulk.add(lowerName)
    }

    if (duplicatesInBulk.size > 0) {
      setError(`Sprunget over duplikerede hold: ${Array.from(duplicatesInBulk).join(', ')}`)
    } else {
      setError('')
    }

    setTeams([...teams, ...newTeams])
    setBulkText('')
  }

  const removeTeam = (id: string) => {
    setTeams(teams.filter(t => t.id !== id))
    setError('')
  }

  const handleNext = () => {
    if (teams.length < 2) {
      setError('Mindst 2 hold er påkrævet')
      return
    }
    onNext(teams)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>Tilføj Hold</CardTitle>
        <CardDescription>Tilføj deltagende hold individuelt eller samlet</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="teamName">Tilføj Hold Individuelt</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="teamName"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Holdnavn"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTeam()
                      }
                    }}
                  />
                  <Button onClick={addTeam} type="button" className="gap-2">
                    <Plus size={20} /> Tilføj
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="bulkTeams">Tilføj Hold Samlet</Label>
                <Textarea
                  id="bulkTeams"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Indsæt holdnavne (ét pr. linje)"
                  className="mt-2 min-h-32"
                />
                <Button onClick={bulkAddTeams} type="button" variant="secondary" className="mt-2 w-full">
                  Tilføj Alle Hold
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users size={20} />
                  Hold ({teams.length})
                </Label>
              </div>

              {teams.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                  <Users size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Ingen hold tilføjet endnu</p>
                  <p className="text-sm mt-1">Tilføj hold ved hjælp af formularen til venstre</p>
                </div>
              ) : (
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {teams.map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-muted-foreground w-6">{index + 1}</span>
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <Button
                          onClick={() => removeTeam(team.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash size={18} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="animate-shake">
              <WarningCircle size={20} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {teams.length > 0 && teams.length < 2 && (
            <Alert>
              <WarningCircle size={20} />
              <AlertDescription>Tilføj mindst 2 hold for at fortsætte</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between pt-4">
            <Button onClick={onBack} variant="outline" size="lg" className="gap-2">
              <ArrowLeft size={20} /> Tilbage
            </Button>
            <Button onClick={handleNext} size="lg" className="gap-2" disabled={teams.length < 2}>
              Næste <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
