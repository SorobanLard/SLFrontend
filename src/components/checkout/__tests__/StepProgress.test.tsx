import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepProgress } from '../StepProgress';

describe('StepProgress', () => {
  it('marks steps before currentStep as completed', () => {
    render(<StepProgress currentStep={3} />);
    // Steps 1 and 2 should be completed (checkmark SVG), step 3 is current
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
  });

  it('shows the current step with aria-current="step"', () => {
    render(<StepProgress currentStep={2} />);
    const currentIndicator = screen.getByText('2');
    // The span wrapping step 2 should have aria-current
    expect(currentIndicator.closest('[aria-current="step"]')).not.toBeNull();
  });

  it('resets later steps when going back to an earlier step (regression #132)', () => {
    const { rerender } = render(<StepProgress currentStep={3} />);

    // At step 3: steps 1 & 2 are completed, step 3 is current
    // Going back to step 1: only step 0 is before step 1, so no steps completed
    rerender(<StepProgress currentStep={1} />);

    // Step 2 and 3 should now show their step numbers (not checkmarks)
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not render clickable buttons when onStepClick is not provided', () => {
    render(<StepProgress currentStep={3} />);
    // No back-navigation buttons should exist
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('renders completed steps as buttons when onStepClick is provided', () => {
    const onStepClick = vi.fn();
    render(<StepProgress currentStep={3} onStepClick={onStepClick} />);
    // Steps 1 and 2 are completed and should be buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
  });

  it('calls onStepClick with the correct step number when a completed step is clicked', () => {
    const onStepClick = vi.fn();
    render(<StepProgress currentStep={3} onStepClick={onStepClick} />);

    const backToStep1 = screen.getByRole('button', { name: 'Go back to Order Review' });
    fireEvent.click(backToStep1);

    expect(onStepClick).toHaveBeenCalledWith(1);
  });

  it('does not mark future steps as completed even after re-render (derived state only)', () => {
    const { rerender } = render(<StepProgress currentStep={2} />);
    // Move forward
    rerender(<StepProgress currentStep={3} />);
    // Move back to step 2
    rerender(<StepProgress currentStep={2} />);

    // Step 3 should now show its number, not a checkmark
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies compact responsive sizing and label truncation on narrow viewports (#196)', () => {
    render(<StepProgress currentStep={1} />);
    const nav = screen.getByRole('navigation', { name: /Checkout progress/i });
    expect(nav.className).toContain('overflow-hidden');

    const label1 = screen.getByTestId('checkout-step-label-1');
    expect(label1.className).toContain('truncate');
    expect(label1.className).toContain('text-[9px]');
    expect(label1.className).toContain('sm:text-[11px]');
  });
});
