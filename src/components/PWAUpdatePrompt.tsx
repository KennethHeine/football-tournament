import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('Service Worker registered:', swUrl)
      
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000) // 1 hour
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
    },
    onNeedRefresh() {
      setShowPrompt(true)
      toast.info('En ny version er tilgængelig!', {
        duration: Infinity,
        action: {
          label: 'Opdater',
          onClick: () => updateServiceWorker(true)
        }
      })
    },
  })

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true)
    }
  }, [needRefresh])

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-semibold">Ny version tilgængelig</h3>
          <p className="text-sm text-muted-foreground">
            En opdatering er klar til installation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => updateServiceWorker(true)}
            size="sm"
          >
            Opdater nu
          </Button>
          <Button
            onClick={() => setShowPrompt(false)}
            variant="outline"
            size="sm"
          >
            Senere
          </Button>
        </div>
      </div>
    </div>
  )
}
