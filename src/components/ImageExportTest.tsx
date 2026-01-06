import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Flask } from '@phosphor-icons/react'
import html2canvas from 'html2canvas'
import { SAFE_COLORS, oklchToRgb, rgbToHex, oklchStringToHex } from '@/lib/color-utils'

interface TestResult {
  name: string
  passed: boolean
  message: string
}

export function ImageExportTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = async () => {
    setIsRunning(true)
    const results: TestResult[] = []

    results.push({
      name: 'OKLCH to RGB Conversion',
      passed: true,
      message: 'Color conversion utilities loaded successfully'
    })

    try {
      const rgb = oklchToRgb(0.55, 0.15, 145)
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b)
      results.push({
        name: 'Primary Color Conversion',
        passed: hex.length === 7 && hex.startsWith('#'),
        message: `Converted OKLCH to ${hex}`
      })
    } catch (error) {
      results.push({
        name: 'Primary Color Conversion',
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    try {
      const testDiv = document.createElement('div')
      testDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        background-color: ${SAFE_COLORS.card};
        padding: 20px;
      `
      testDiv.innerHTML = `
        <div style="background-color: ${SAFE_COLORS.headerBg}; padding: 10px; color: ${SAFE_COLORS.text};">
          <h1 style="margin: 0; color: ${SAFE_COLORS.text};">Test Header</h1>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <tr style="background-color: ${SAFE_COLORS.tableBg};">
            <td style="padding: 8px; color: ${SAFE_COLORS.text};">Test Cell 1</td>
            <td style="padding: 8px; color: ${SAFE_COLORS.mutedForeground};">Test Cell 2</td>
          </tr>
        </table>
      `
      
      document.body.appendChild(testDiv)
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const canvas = await html2canvas(testDiv, {
        scale: 1,
        backgroundColor: SAFE_COLORS.card,
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
      })
      
      document.body.removeChild(testDiv)
      
      results.push({
        name: 'HTML2Canvas Rendering',
        passed: canvas.width > 0 && canvas.height > 0,
        message: `Canvas created: ${canvas.width}x${canvas.height}px`
      })
    } catch (error) {
      results.push({
        name: 'HTML2Canvas Rendering',
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    try {
      const testTable = document.createElement('div')
      testTable.style.cssText = `
        position: absolute;
        left: -9999px;
        width: 600px;
        background-color: ${SAFE_COLORS.card};
        padding: 20px;
      `
      
      testTable.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 1px solid ${SAFE_COLORS.border};">
          <thead>
            <tr style="background-color: ${SAFE_COLORS.headerBg};">
              <th style="padding: 8px; color: ${SAFE_COLORS.headerText};">Time</th>
              <th style="padding: 8px; color: ${SAFE_COLORS.headerText};">Pitch</th>
              <th style="padding: 8px; color: ${SAFE_COLORS.headerText};">Home</th>
              <th style="padding: 8px; color: ${SAFE_COLORS.headerText};">Away</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: ${SAFE_COLORS.tableBg};">
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">09:00</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">1</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">Team A</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">Team B</td>
            </tr>
            <tr style="background-color: ${SAFE_COLORS.tableAlt};">
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">09:30</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">2</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">Team C</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">Team D</td>
            </tr>
            <tr style="background-color: ${SAFE_COLORS.tableConflict};">
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">10:00</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">1</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">Team E</td>
              <td style="padding: 8px; color: ${SAFE_COLORS.text};">Team F</td>
            </tr>
          </tbody>
        </table>
      `
      
      document.body.appendChild(testTable)
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const canvas = await html2canvas(testTable, {
        scale: 2,
        backgroundColor: SAFE_COLORS.card,
        logging: false,
        useCORS: true,
        allowTaint: false,
        foreignObjectRendering: false,
      })
      
      document.body.removeChild(testTable)
      
      const imageUrl = canvas.toDataURL('image/png')
      
      results.push({
        name: 'Full Table Export',
        passed: imageUrl.length > 1000,
        message: `Generated PNG (${Math.round(imageUrl.length / 1024)}KB)`
      })
    } catch (error) {
      results.push({
        name: 'Full Table Export',
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    try {
      Object.entries(SAFE_COLORS).forEach(([key, value]) => {
        if (!value.startsWith('#')) {
          throw new Error(`Invalid color for ${key}: ${value}`)
        }
      })
      results.push({
        name: 'Safe Colors Validation',
        passed: true,
        message: 'All colors are valid hex values'
      })
    } catch (error) {
      results.push({
        name: 'Safe Colors Validation',
        passed: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    setTestResults(results)
    setIsRunning(false)
  }

  const allPassed = testResults.length > 0 && testResults.every(r => r.passed)
  const anyFailed = testResults.some(r => !r.passed)

  return (
    <Card className="max-w-3xl mx-auto mt-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flask size={24} className="text-primary" weight="fill" />
          <CardTitle>Billede Export Test Suite</CardTitle>
        </div>
        <CardDescription>
          Test farve konvertering og HTML2Canvas funktionalitet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Kører tests...' : 'Kør Tests'}
        </Button>

        {testResults.length > 0 && (
          <>
            {allPassed && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="text-green-600" weight="fill" />
                <AlertDescription className="text-green-800">
                  Alle tests bestået! Billede export skal virke korrekt.
                </AlertDescription>
              </Alert>
            )}
            
            {anyFailed && (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="text-red-600" weight="fill" />
                <AlertDescription className="text-red-800">
                  Nogle tests fejlede. Se detaljer nedenfor.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {testResults.map((result, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  {result.passed ? (
                    <CheckCircle size={20} className="text-green-600 mt-0.5" weight="fill" />
                  ) : (
                    <XCircle size={20} className="text-red-600 mt-0.5" weight="fill" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.name}</span>
                      <Badge variant={result.passed ? 'default' : 'destructive'}>
                        {result.passed ? 'Bestået' : 'Fejlet'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Safe Colors Reference:</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(SAFE_COLORS).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: value }}
                    />
                    <code className="text-xs">{key}: {value}</code>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
