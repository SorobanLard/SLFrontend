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
  /**
   * Called when the user clicks on a previously-completed step to go back
   * and edit it. When provided, completed step indicators become interactive
   * buttons. The parent is responsible for updating `currentStep`, which will
   * automatically reset the completed marker for any step >= the new
   * `currentStep` (derived state — no stale completed flags possible).
   */
  onStepClick?: (step: CheckoutStep) => void;
  className?: string;
}

export function StepProgress({ currentStep, onStepClick, className }: StepProgressProps) {
  return (
    <nav aria-label="Checkout progress" className={cn('w-full max-w-full overflow-hidden', className)}>
      <ol className="flex w-full min-w-0 items-center justify-between gap-0">
        {CHECKOUT_STEPS.map((step, index) => {
          // Derived purely from currentStep so going back always resets later
          // steps — there is no separate "completed" state that could go stale.
          const isCompleted = currentStep > step.step;
          const isCurrent = currentStep === step.step;
          const isFuture = currentStep < step.step;

          const indicator = (
            <span
              className={cn(
                'flex h-7 w-7 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-all duration-300',
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
            <li key={step.step} className="flex min-w-0 items-center flex-1 last:flex-none">
              {/* Step indicator — clickable when completed and onStepClick is provided */}
              <div className="flex min-w-0 flex-col items-center text-center">
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
                  data-testid={`checkout-step-label-${step.step}`}
                  className={cn(
                    'mt-1 sm:mt-1.5 max-w-[4.75rem] sm:max-w-none truncate text-[9px] sm:text-[11px] font-medium uppercase tracking-tight sm:tracking-[0.08em] transition-colors duration-300',
                    isCompleted && 'text-leaf-700',
                    isCurrent && 'text-sorobanlard-primary font-semibold',
                    isFuture && 'text-ink-400',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < CHECKOUT_STEPS.length - 1 && (
                <div className="mx-1.5 sm:mx-3 flex-1 min-w-[0.75rem]">
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
