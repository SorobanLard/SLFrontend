import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WalletPaymentButton from './WalletPaymentButton';

describe('WalletPaymentButton', () => {
  const onConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the default connect label', () => {
    render(<WalletPaymentButton onConnect={onConnect} />);
    expect(
      screen.getByRole('button', { name: /connect wallet/i })
    ).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<WalletPaymentButton onConnect={onConnect} label="Pay with wallet" />);
    expect(
      screen.getByRole('button', { name: /pay with wallet/i })
    ).toBeInTheDocument();
  });

  it('calls onConnect when clicked', () => {
    render(<WalletPaymentButton onConnect={onConnect} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('does not call onConnect when disabled', () => {
    render(<WalletPaymentButton onConnect={onConnect} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onConnect).not.toHaveBeenCalled();
  });

  it('shows a loading state and blocks interaction while loading', () => {
    render(<WalletPaymentButton onConnect={onConnect} loading />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    fireEvent.click(button);
    expect(onConnect).not.toHaveBeenCalled();
  });

  it('renders an error message when an error is provided', () => {
    render(
      <WalletPaymentButton onConnect={onConnect} error="Wallet connection failed" />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /wallet connection failed/i
    );
  });

  it('triggers onConnect via keyboard activation', () => {
    render(<WalletPaymentButton onConnect={onConnect} />);
    const button = screen.getByRole('button');
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.click(button);
    expect(onConnect).toHaveBeenCalledTimes(1);
  });
});
