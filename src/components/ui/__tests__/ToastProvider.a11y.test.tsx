import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToastContext } from '../ToastProvider';

function ToastTriggerHarness() {
  const toast = useToastContext();
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          toast.success({
            title: 'Course enrolled',
            description: 'You now have access to all lessons.',
            duration: 1000,
          })
        }
      >
        Trigger Success
      </button>
      <button
        type="button"
        onClick={() =>
          toast.error({
            title: 'Payment failed',
            description: 'Could not verify transaction on Stellar.',
            duration: 1000,
          })
        }
      >
        Trigger Error
      </button>
      <button
        type="button"
        onClick={() => {
          toast.info({ title: 'Notice 1' });
          toast.info({ title: 'Notice 2' });
          toast.info({ title: 'Notice 3' });
          toast.info({ title: 'Notice 4' });
        }}
      >
        Trigger Batch
      </button>
    </div>
  );
}

describe('ToastProvider aria-live toast announcements (#224)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces success toasts with role="status" aria-live="polite" and error toasts with role="alert" aria-live="assertive"', () => {
    render(
      <ToastProvider>
        <ToastTriggerHarness />
      </ToastProvider>,
    );

    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-relevant', 'additions text');

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
    const statusToast = screen.getByRole('status');
    expect(statusToast).toHaveAttribute('aria-live', 'polite');
    expect(statusToast).toHaveAttribute('aria-atomic', 'true');
    expect(statusToast).toHaveTextContent('Course enrolled');
    expect(statusToast).toHaveTextContent('You now have access to all lessons.');
    expect(
      screen.getByRole('button', { name: /dismiss notification: course enrolled/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /trigger error/i }));
    const alertToast = screen.getByRole('alert');
    expect(alertToast).toHaveAttribute('aria-live', 'assertive');
    expect(alertToast).toHaveAttribute('aria-atomic', 'true');
    expect(alertToast).toHaveTextContent('Payment failed');
  });

  it('pauses auto-dismiss while keyboard focus is inside a toast and resumes on blur', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastTriggerHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
    const dismissButton = screen.getByRole('button', {
      name: /dismiss notification: course enrolled/i,
    });

    act(() => {
      dismissButton.focus();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      dismissButton.blur();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('dismisses the latest visible toast on Escape even when extra toasts are queued', () => {
    render(
      <ToastProvider>
        <ToastTriggerHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger batch/i }));
    expect(screen.getByText('Notice 1')).toBeInTheDocument();
    expect(screen.getByText('Notice 2')).toBeInTheDocument();
    expect(screen.getByText('Notice 3')).toBeInTheDocument();
    expect(screen.queryByText('Notice 4')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Notice 3')).not.toBeInTheDocument();
    expect(screen.getByText('Notice 4')).toBeInTheDocument();
  });
});
