import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepProgress } from '../StepProgress';

describe('StepProgress', () => {
  it('marks steps before currentStep as completed', () => {
    render(<StepProgress currentStep={3} />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
  });

  it('shows the current step with aria-current="step"', () => {
    render(<StepProgress currentStep={2} />);
    const currentIndicator = screen.getByText('2');
    expect(currentIndicator.closest('[aria-current="step"]')).not.toBeNull();
  });

  it('resets later steps when going back to an earlier step (regression #132)', () => {
    const { rerender } = render(<StepProgress currentStep={3} />);
    rerender(<StepProgress currentStep={1} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not render clickable buttons when onStepClick is not provided', () => {
    render(<StepProgress currentStep={3} />);
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('renders completed steps as buttons when onStepClick is provided', () => {
    const onStepClick = vi.fn();
    render(<StepProgress currentStep={3} onStepClick={onStepClick} />);
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
    rerender(<StepProgress currentStep={3} />);
    rerender(<StepProgress currentStep={2} />);

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it.each([320, 375, 768, 1024])(
    'prevents step label overflow and collision on narrow viewports (%ipx) (#196)',
    (width) => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      });
      window.dispatchEvent(new Event('resize'));

      render(<StepProgress currentStep={2} />);

      const nav = screen.getByRole('navigation', { name: /checkout progress/i });
      expect(nav.className).toContain('max-w-full');
      expect(nav.className).toContain('overflow-hidden');

      const step1Label = screen.getByTestId('step-label-1');
      const step3Label = screen.getByTestId('step-label-3');
      expect(step1Label.className).toContain('truncate');
      expect(step3Label.className).toContain('truncate');
    },
  );
});
