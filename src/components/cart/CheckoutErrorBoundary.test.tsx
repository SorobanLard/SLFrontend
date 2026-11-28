import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CheckoutErrorBoundary } from './CheckoutErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Checkout exploded');
  }
  return <div>Checkout content</div>;
}

describe('CheckoutErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs caught errors to console.error; silence it for clean test output.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders its children when no error occurs', () => {
    render(
      <CheckoutErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </CheckoutErrorBoundary>
    );

    expect(screen.getByText('Checkout content')).toBeInTheDocument();
  });

  it('renders a fallback when a child throws', () => {
    render(
      <CheckoutErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(screen.queryByText('Checkout content')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders a custom fallback when provided', () => {
    render(
      <CheckoutErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingChild shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('recovers and re-renders children after the reset action is triggered', () => {
    render(
      <CheckoutErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </CheckoutErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /try again|reset|retry/i });
    fireEvent.click(resetButton);

    // After reset the boundary should attempt to render children again.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
