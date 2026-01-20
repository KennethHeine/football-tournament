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
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {steps.map((step) => {
          const isCompleted = currentStep > step.number
          const isCurrent = currentStep === step.number
          
          return (
            <div key={step.number} className="flex flex-col items-center gap-2 bg-background px-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check size={20} weight="bold" /> : step.number}
              </div>
              <span 
                className={cn(
                  "text-xs font-medium text-center whitespace-nowrap hidden sm:block",
                  isCurrent && "text-foreground font-semibold",
                  !isCurrent && "text-muted-foreground"
                )}
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {step.title}
              </span>
            </div>
          )
        })}
      </div>
      
      <div className="sm:hidden text-center mt-4 text-sm font-medium text-foreground">
        Trin {currentStep} af {steps.length}: {steps[currentStep - 1]?.title}
      </div>
    </div>
  )
}
