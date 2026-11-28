import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastProvider';

function TriggerToast({ message, duration }: { message: string; duration?: number }) {
  const { showToast } = useToast();
  return (
    <button type="button" onClick={() => showToast(message, duration)}>
      Trigger
    </button>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children without any toasts initially', () => {
    render(
      <ToastProvider>
        <div>Child content</div>
      </ToastProvider>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a toast when showToast is called', () => {
    render(
      <ToastProvider>
        <TriggerToast message="Saved successfully" />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Trigger' }).click();
    });

    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('stacks multiple toasts', () => {
    render(
      <ToastProvider>
        <TriggerToast message="First toast" />
        <TriggerToast message="Second toast" />
      </ToastProvider>
    );

    const buttons = screen.getAllByRole('button', { name: 'Trigger' });
    act(() => {
      buttons[0].click();
      buttons[1].click();
    });

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('auto-dismisses a toast after its duration', () => {
    render(
      <ToastProvider>
        <TriggerToast message="Temporary toast" duration={3000} />
      </ToastProvider>
    );

    act(() => {
      screen.getByRole('button', { name: 'Trigger' }).click();
    });

    expect(screen.getByText('Temporary toast')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Temporary toast')).not.toBeInTheDocument();
  });
});
