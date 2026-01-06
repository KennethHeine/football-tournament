import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeneratedSchedule, Match, Team } from '@/lib/types'
import { ArrowLeft, Printer, Download, Copy, MagnifyingGlass, WarningCircle, Check } from '@phosphor-icons/react'
import { exportToCSV, exportToText } from '@/lib/scheduler'
import { toast } from 'sonner'

interface Step4Props {
  schedule: GeneratedSchedule
  tournamentName: string
  teams: Team[]
  onBack: () => void
  onSave: () => void
}

export function Step4Schedule({ schedule, tournamentName, teams, onBack, onSave }: Step4Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPitch, setSelectedPitch] = useState<string>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [copied, setCopied] = useState(false)

  const pitches = useMemo(() => {
    const pitchSet = new Set(schedule.matches.map(m => m.pitch))
    return Array.from(pitchSet).sort((a, b) => a - b)
  }, [schedule.matches])

  const filteredMatches = useMemo(() => {
    return schedule.matches.filter(match => {
      const matchesPitch = selectedPitch === 'all' || match.pitch === Number(selectedPitch)
      const matchesTeam = selectedTeam === 'all' || 
        match.homeTeam.id === selectedTeam || 
        match.awayTeam.id === selectedTeam
      const matchesSearch = searchQuery === '' || 
        match.homeTeam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.awayTeam.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesPitch && matchesTeam && matchesSearch
    })
  }, [schedule.matches, selectedPitch, selectedTeam, searchQuery])

  const matchesByTime = useMemo(() => {
    const grouped = new Map<string, Match[]>()
    filteredMatches.forEach(match => {
      const timeKey = match.startTime.toISOString()
      if (!grouped.has(timeKey)) {
        grouped.set(timeKey, [])
      }
      grouped.get(timeKey)!.push(match)
    })
    return Array.from(grouped.entries()).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    )
  }, [filteredMatches])

  const teamMatches = useMemo(() => {
    if (selectedTeam === 'all') return []
    return schedule.matches.filter(m => 
      m.homeTeam.id === selectedTeam || m.awayTeam.id === selectedTeam
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }, [schedule.matches, selectedTeam])

  const isConflict = (match: Match) => {
    return schedule.conflicts.some(conflict => 
      conflict.matches.some(m => m.id === match.id)
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadCSV = () => {
    const csv = exportToCSV(schedule.matches)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tournamentName || 'tournament'}-schedule.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded successfully')
  }

  const handleCopyText = async () => {
    const text = exportToText(schedule.matches)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Schedule copied to clipboard')
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  return (
    <Card>
      <CardHeader className="no-print">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
              {tournamentName || 'Tournament Schedule'}
            </CardTitle>
            <CardDescription>
              {schedule.matches.length} matches scheduled across {pitches.length} pitch{pitches.length !== 1 ? 'es' : ''}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
              <Printer size={18} /> Print
            </Button>
            <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-2">
              <Download size={18} /> CSV
            </Button>
            <Button onClick={handleCopyText} variant="outline" size="sm" className="gap-2">
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {schedule.warnings.length > 0 && (
            <div className="space-y-2 no-print">
              {schedule.warnings.map((warning, idx) => (
                <Alert key={idx} variant={schedule.conflicts.length > 0 && idx === 0 ? 'destructive' : 'default'}>
                  <WarningCircle size={20} />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <Tabs defaultValue="program" className="w-full">
            <TabsList className="grid w-full grid-cols-2 no-print">
              <TabsTrigger value="program">Program View</TabsTrigger>
              <TabsTrigger value="team">Team View</TabsTrigger>
            </TabsList>

            <TabsContent value="program" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
                <div className="relative">
                  <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search teams..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedPitch} onValueChange={setSelectedPitch}>
                  <SelectTrigger>
                    <SelectValue placeholder="All pitches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All pitches</SelectItem>
                    {pitches.map(pitch => (
                      <SelectItem key={pitch} value={pitch.toString()}>
                        Pitch {pitch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All teams</SelectItem>
                    {teams.filter(t => t.id !== 'BYE').map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Pitch</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Home</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">vs</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Away</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">End Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {matchesByTime.map(([timeKey, matches]) => (
                        matches.map((match, idx) => (
                          <tr 
                            key={match.id}
                            className={`transition-colors ${
                              isConflict(match) 
                                ? 'bg-destructive/10 hover:bg-destructive/20' 
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            {idx === 0 ? (
                              <td rowSpan={matches.length} className="px-4 py-3 font-semibold align-top border-r">
                                {formatTime(match.startTime)}
                              </td>
                            ) : null}
                            <td className="px-4 py-3">
                              <Badge variant="outline">Pitch {match.pitch}</Badge>
                            </td>
                            <td className="px-4 py-3 font-medium">{match.homeTeam.name}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">vs</td>
                            <td className="px-4 py-3 font-medium">{match.awayTeam.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {formatTime(match.endTime)}
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredMatches.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No matches found matching your filters
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <div className="no-print">
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.filter(t => t.id !== 'BYE').map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTeam === 'all' ? (
                <div className="p-8 text-center text-muted-foreground">
                  Select a team to view their schedule
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-primary text-primary-foreground px-6 py-4">
                    <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                      {teams.find(t => t.id === selectedTeam)?.name}
                    </h3>
                    <p className="text-sm opacity-90 mt-1">
                      {teamMatches.length} match{teamMatches.length !== 1 ? 'es' : ''} scheduled
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {teamMatches.map((match, idx) => {
                      const isHome = match.homeTeam.id === selectedTeam
                      const opponent = isHome ? match.awayTeam : match.homeTeam
                      
                      return (
                        <div key={match.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground">Match {idx + 1}</div>
                                <Badge variant="outline" className="mt-1">Pitch {match.pitch}</Badge>
                              </div>
                              <div>
                                <div className="font-semibold">
                                  vs {opponent.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(match.startTime)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatTime(match.startTime)}</div>
                              <div className="text-xs text-muted-foreground">
                                Ends {formatTime(match.endTime)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-4 no-print">
            <Button onClick={onBack} variant="outline" size="lg" className="gap-2">
              <ArrowLeft size={20} /> Back
            </Button>
            <Button onClick={onSave} size="lg" className="gap-2">
              <Check size={20} /> Save Tournament
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
