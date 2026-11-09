import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToastContext } from '../ToastProvider';

function ToastTrigger() {
  const toast = useToastContext();
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          toast.success({
            title: 'Course saved',
            description: 'Your changes have been saved.',
          })
        }
      >
        Trigger Success
      </button>
      <button
        type="button"
        onClick={() =>
          toast.error({
            title: 'Save failed',
            description: 'Could not save changes.',
          })
        }
      >
        Trigger Error
      </button>
      <button
        type="button"
        onClick={() =>
          toast.warning({
            title: 'Low balance',
            description: 'Top up your wallet soon.',
          })
        }
      >
        Trigger Warning
      </button>
      <button
        type="button"
        onClick={() =>
          toast.info({
            title: 'New update',
            description: 'Version 2.0 is available.',
          })
        }
      >
        Trigger Info
      </button>
    </div>
  );
}

describe('ToastProvider accessibility (Issue #224)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders an aria-live notifications region without stealing focus', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-relevant', 'additions text');
  });

  it('announces success, info, and warning toasts via polite status role with aria-atomic', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    const triggerBtn = screen.getByRole('button', { name: 'Trigger Success' });
    triggerBtn.focus();
    fireEvent.click(triggerBtn);

    const statusToast = screen.getByRole('status');
    expect(statusToast).toBeInTheDocument();
    expect(statusToast).toHaveAttribute('aria-live', 'polite');
    expect(statusToast).toHaveAttribute('aria-atomic', 'true');
    expect(statusToast).toHaveTextContent('Course saved');
    expect(statusToast).toHaveTextContent('Your changes have been saved.');
    // Does not steal focus from the trigger control
    expect(document.activeElement).toBe(triggerBtn);
  });

  it('announces error toasts via assertive alert role with aria-atomic', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Error' }));

    const alertToast = screen.getByRole('alert');
    expect(alertToast).toBeInTheDocument();
    expect(alertToast).toHaveAttribute('aria-live', 'assertive');
    expect(alertToast).toHaveAttribute('aria-atomic', 'true');
    expect(alertToast).toHaveTextContent('Save failed');
    expect(alertToast).toHaveTextContent('Could not save changes.');
  });

  it('supports keyboard dismissal via the accessible dismiss button and Escape key', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Trigger Info' }));
    expect(screen.getByRole('status')).toHaveTextContent('New update');

    const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
    expect(dismissButton).toBeInTheDocument();

    fireEvent.keyDown(dismissButton, { key: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByRole('status')).toBeNull();
  });
});
