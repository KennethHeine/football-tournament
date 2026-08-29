import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Step {
  number: number
  title: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="w-full py-6" role="navigation" aria-label="Wizard progress">
      <div className="flex items-center justify-between relative">
        {/* Progress line background */}
        <div
          className="absolute top-5 left-0 right-0 h-1 bg-border -z-10 rounded-full"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Trin ${currentStep} af ${steps.length}`}
        >
          {/* Progress line fill */}
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {steps.map(step => {
          const isCompleted = currentStep > step.number
          const isCurrent = currentStep === step.number

          return (
            <div key={step.number} className="flex flex-col items-center gap-2 bg-background px-2">
              <div
                className={cn(
                  'w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 shadow-sm',
                  isCompleted &&
                    'bg-primary text-primary-foreground shadow-md scale-100 ring-2 ring-primary/20',
                  isCurrent &&
                    'bg-primary text-primary-foreground ring-4 ring-primary/30 shadow-lg scale-110',
                  !isCompleted &&
                    !isCurrent &&
                    'bg-muted text-muted-foreground border-2 border-border'
                )}
              >
                {isCompleted ? <Check size={22} weight="bold" /> : step.number}
              </div>
              <span
                className={cn(
                  'text-xs font-medium text-center whitespace-nowrap hidden sm:block transition-all duration-300',
                  isCurrent && 'text-foreground font-bold',
                  isCompleted && 'text-primary font-semibold',
                  !isCurrent && !isCompleted && 'text-muted-foreground'
                )}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile step indicator */}
      <div className="sm:hidden text-center mt-4">
        <span
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Trin {currentStep} af {steps.length}: {steps[currentStep - 1]?.title}
        </span>
      </div>
    </div>
  )
}
