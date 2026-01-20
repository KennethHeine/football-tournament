import { useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeneratedSchedule, Match, Team, TournamentSettings } from '@/lib/types'
import { ArrowLeft, Printer, Download, Copy, MagnifyingGlass, WarningCircle, Check, Image } from '@phosphor-icons/react'
import { exportToCSV, exportToText, getPitchName } from '@/lib/scheduler'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import { SAFE_COLORS } from '@/lib/color-utils'

interface Step4Props {
  schedule: GeneratedSchedule
  tournamentName: string
  teams: Team[]
  settings: TournamentSettings
  onBack: () => void
  onSave: () => void
}

export function Step4Schedule({ schedule, tournamentName, teams, settings, onBack, onSave }: Step4Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPitch, setSelectedPitch] = useState<string>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [copied, setCopied] = useState(false)
  const [exportingImage, setExportingImage] = useState(false)
  const scheduleRef = useRef<HTMLDivElement>(null)

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
    const csv = exportToCSV(schedule.matches, settings)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tournamentName || 'turnering'}-skema.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloadet')
  }

  const handleCopyText = async () => {
    const text = exportToText(schedule.matches, settings)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Skema kopieret til udklipsholder')
  }

  const getMatchTimingInfo = () => {
    if (settings.matchMode === 'full-time') {
      return `Spilletid: ${settings.matchDurationMinutes} min`
    } else {
      return `Spilletid: 2 × ${settings.halfDurationMinutes} min | Halvleg pause: ${settings.halftimeBreakMinutes} min`
    }
  }

  const handleExportImage = async () => {
    setExportingImage(true)
    const toastId = toast.loading('Genererer billede...')
    
    try {
      const headingFont = 'Outfit, system-ui, sans-serif'
      
      const tableRows = matchesByTime.map(([_timeKey, matches]) => 
        matches.map((match, idx) => {
          const conflict = isConflict(match)
          const rowBg = conflict 
            ? SAFE_COLORS.tableConflict
            : idx % 2 === 0 ? SAFE_COLORS.tableBg : SAFE_COLORS.tableAlt
          
          const timeCell = idx === 0 ? `
            <td rowspan="${matches.length}" style="padding: 12px 16px; font-weight: 600; vertical-align: top; border-right: 1px solid ${SAFE_COLORS.border}; color: ${SAFE_COLORS.text};">
              ${formatTime(match.startTime)}
            </td>
          ` : ''
          
          return `
            <tr style="background-color: ${rowBg};">
              ${timeCell}
              <td style="padding: 12px 16px; color: ${SAFE_COLORS.text};">
                <span style="display: inline-block; padding: 4px 10px; background-color: ${SAFE_COLORS.muted}; border: 1px solid ${SAFE_COLORS.border}; border-radius: 6px; font-size: 13px; font-weight: 500; color: ${SAFE_COLORS.text};">
                  ${getPitchName(match.pitch, settings)}
                </span>
              </td>
              <td style="padding: 12px 16px; font-weight: 500; color: ${SAFE_COLORS.text};">${match.homeTeam.name}</td>
              <td style="padding: 12px 16px; text-align: center; color: ${SAFE_COLORS.mutedForeground};">mod</td>
              <td style="padding: 12px 16px; font-weight: 500; color: ${SAFE_COLORS.text};">${match.awayTeam.name}</td>
              <td style="padding: 12px 16px; color: ${SAFE_COLORS.mutedForeground};">${formatTime(match.endTime)}</td>
            </tr>
          `
        }).join('')
      ).join('')
      
      // Create an iframe to isolate from page CSS (avoids oklch color parsing issues in html2canvas)
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 1280px; height: 2000px; border: none;'
      document.body.appendChild(iframe)
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) {
        throw new Error('Could not access iframe document')
      }
      
      iframeDoc.open()
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Inter, system-ui, sans-serif;
              background-color: ${SAFE_COLORS.card};
              color: ${SAFE_COLORS.text};
            }
          </style>
        </head>
        <body>
          <div id="capture" style="width: 1200px; padding: 40px; background-color: ${SAFE_COLORS.card};">
            <div style="margin-bottom: 32px; border-bottom: 2px solid ${SAFE_COLORS.border}; padding-bottom: 24px;">
              <h1 style="font-family: ${headingFont}; font-size: 36px; font-weight: 700; text-align: center; margin: 0 0 12px 0; color: ${SAFE_COLORS.text};">
                ${tournamentName || 'Turneringsskema'}
              </h1>
              <p style="text-align: center; color: ${SAFE_COLORS.mutedForeground}; font-size: 16px; margin: 0 0 8px 0;">
                ${schedule.matches.length} kampe • ${pitches.length} ban${pitches.length !== 1 ? 'er' : 'e'}
              </p>
              <p style="text-align: center; color: ${SAFE_COLORS.mutedForeground}; font-size: 14px; margin: 0;">
                ${getMatchTimingInfo()}
              </p>
            </div>
            <div style="border: 1px solid ${SAFE_COLORS.border}; border-radius: 8px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: ${SAFE_COLORS.headerBg};">
                    <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${SAFE_COLORS.headerText}; border-bottom: 1px solid ${SAFE_COLORS.border};">Tidspunkt</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${SAFE_COLORS.headerText}; border-bottom: 1px solid ${SAFE_COLORS.border};">Bane</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${SAFE_COLORS.headerText}; border-bottom: 1px solid ${SAFE_COLORS.border};">Hjemme</th>
                    <th style="padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${SAFE_COLORS.headerText}; border-bottom: 1px solid ${SAFE_COLORS.border};">mod</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${SAFE_COLORS.headerText}; border-bottom: 1px solid ${SAFE_COLORS.border};">Ude</th>
                    <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: ${SAFE_COLORS.headerText}; border-bottom: 1px solid ${SAFE_COLORS.border};">Sluttid</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>
        </body>
        </html>
      `)
      iframeDoc.close()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const captureElement = iframeDoc.getElementById('capture')
      if (!captureElement) {
        throw new Error('Could not find capture element')
      }
      
      const canvas = await html2canvas(captureElement, {
        scale: 2,
        backgroundColor: SAFE_COLORS.card,
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
      })
      
      document.body.removeChild(iframe)
      
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Kunne ikke generere billede', { id: toastId })
          setExportingImage(false)
          return
        }
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${tournamentName || 'turnering'}-skema.png`
        a.click()
        URL.revokeObjectURL(url)
        
        toast.success('Billede downloadet', { id: toastId })
        setExportingImage(false)
      }, 'image/png')
    } catch (error) {
      console.error('Failed to export image:', error)
      toast.error(`Kunne ikke eksportere billede: ${error instanceof Error ? error.message : 'Ukendt fejl'}`, { id: toastId })
      setExportingImage(false)
    }
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
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-heading)' }}>
              {tournamentName || 'Turneringsskema'}
            </CardTitle>
            <CardDescription>
              {schedule.matches.length} kampe planlagt på tværs af {pitches.length} ban{pitches.length !== 1 ? 'er' : 'e'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExportImage} variant="outline" size="sm" className="gap-2" disabled={exportingImage}>
              <Image size={18} /> {exportingImage ? 'Genererer...' : 'Gem som billede'}
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
              <Printer size={18} /> Udskriv
            </Button>
            <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-2">
              <Download size={18} /> CSV
            </Button>
            <Button onClick={handleCopyText} variant="outline" size="sm" className="gap-2">
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Kopieret!' : 'Kopiér'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={scheduleRef}>
        <div className="space-y-6">
          <div className="print-only border-b pb-4 mb-6">
            <h1 className="text-3xl font-bold text-center mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {tournamentName || 'Turneringsskema'}
            </h1>
            <p className="text-center text-muted-foreground">
              {schedule.matches.length} kampe • {pitches.length} ban{pitches.length !== 1 ? 'er' : 'e'}
            </p>
            <p className="text-center text-muted-foreground text-sm mt-1">
              {getMatchTimingInfo()}
            </p>
          </div>

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
              <TabsTrigger value="program">Programvisning</TabsTrigger>
              <TabsTrigger value="team">Holdvisning</TabsTrigger>
            </TabsList>

            <TabsContent value="program" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
                <div className="relative">
                  <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Søg hold..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedPitch} onValueChange={setSelectedPitch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle baner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle baner</SelectItem>
                    {pitches.map(pitch => (
                      <SelectItem key={pitch} value={pitch.toString()}>
                        {getPitchName(pitch, settings)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle hold" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle hold</SelectItem>
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
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Tidspunkt</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Bane</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Hjemme</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">mod</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Ude</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Sluttid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {matchesByTime.map(([_timeKey, matches]) => (
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
                              <Badge variant="outline">{getPitchName(match.pitch, settings)}</Badge>
                            </td>
                            <td className="px-4 py-3 font-medium">{match.homeTeam.name}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground">mod</td>
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
                    Ingen kampe fundet der matcher dine filtre
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <div className="no-print">
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vælg et hold" />
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
                  Vælg et hold for at se deres skema
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <div className="bg-primary text-primary-foreground px-6 py-4">
                    <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                      {teams.find(t => t.id === selectedTeam)?.name}
                    </h3>
                    <p className="text-sm opacity-90 mt-1">
                      {teamMatches.length} kamp{teamMatches.length !== 1 ? 'e' : ''} planlagt
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
                                <div className="text-xs text-muted-foreground">Kamp {idx + 1}</div>
                                <Badge variant="outline" className="mt-1">{getPitchName(match.pitch, settings)}</Badge>
                              </div>
                              <div>
                                <div className="font-semibold">
                                  mod {opponent.name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatDate(match.startTime)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatTime(match.startTime)}</div>
                              <div className="text-xs text-muted-foreground">
                                Slutter {formatTime(match.endTime)}
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
              <ArrowLeft size={20} /> Tilbage
            </Button>
            <Button onClick={onSave} size="lg" className="gap-2">
              <Check size={20} /> Gem Turnering
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
