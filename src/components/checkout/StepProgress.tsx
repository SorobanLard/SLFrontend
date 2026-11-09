'use client';

import { cn } from '@/lib/utils';

export const CHECKOUT_STEPS = [
  { step: 1, label: 'Order Review' },
  { step: 2, label: 'Payment' },
  { step: 3, label: 'Confirmation' },
] as const;

export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]['step'];

interface StepProgressProps {
  currentStep: CheckoutStep;
  onStepClick?: (step: CheckoutStep) => void;
  className?: string;
}

export function StepProgress({ currentStep, onStepClick, className }: StepProgressProps) {
  return (
    <nav
      aria-label="Checkout progress"
      className={cn('w-full max-w-full overflow-hidden px-1 sm:px-0', className)}
    >
      <ol className="flex w-full items-start sm:items-center justify-between gap-1 sm:gap-0">
        {CHECKOUT_STEPS.map((step, index) => {
          const isCompleted = currentStep > step.step;
          const isCurrent = currentStep === step.step;
          const isFuture = currentStep < step.step;

          const indicator = (
            <span
              className={cn(
                'flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-all duration-300',
                isCompleted &&
                  'bg-leaf-600 text-white shadow-md shadow-leaf-600/20',
                isCurrent &&
                  'bg-sorobanlard-primary text-white shadow-md shadow-sorobanlard-primary/20 ring-2 ring-sorobanlard-primary/30',
                isFuture && 'bg-ink-100 text-ink-400',
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isCompleted ? (
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                step.step
              )}
            </span>
          );

          return (
            <li
              key={step.step}
              className={cn(
                'flex items-center min-w-0',
                index < CHECKOUT_STEPS.length - 1 ? 'flex-1' : 'shrink-0',
              )}
            >
              <div className="flex flex-col items-center min-w-0">
                {isCompleted && onStepClick ? (
                  <button
                    type="button"
                    onClick={() => onStepClick(step.step as CheckoutStep)}
                    aria-label={`Go back to ${step.label}`}
                    className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-sorobanlard-primary focus:ring-offset-2"
                  >
                    {indicator}
                  </button>
                ) : (
                  indicator
                )}
                <span
                  data-testid={`step-label-${step.step}`}
                  className={cn(
                    'mt-1.5 max-w-[84px] sm:max-w-none truncate text-center text-[10px] sm:text-[11px] font-medium uppercase tracking-tight sm:tracking-[0.08em] leading-tight transition-colors duration-300',
                    isCompleted && 'text-leaf-700',
                    isCurrent && 'text-sorobanlard-primary font-semibold',
                    isFuture && 'text-ink-400',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < CHECKOUT_STEPS.length - 1 && (
                <div className="mx-1.5 sm:mx-3 flex-1 min-w-[12px]">
                  <div
                    className={cn(
                      'h-0.5 rounded-full transition-all duration-500',
                      isCompleted ? 'bg-leaf-600' : 'bg-ink-200',
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
