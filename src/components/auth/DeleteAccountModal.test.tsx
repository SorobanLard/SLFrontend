import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeleteAccountModal from './DeleteAccountModal';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

describe('DeleteAccountModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<DeleteAccountModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an inline error when the confirmation is empty', async () => {
    render(<DeleteAccountModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(await screen.findByText(/confirmation/i)).toBeInTheDocument();
  });

  it('shows an inline error when the confirmation phrase is wrong', async () => {
    render(<DeleteAccountModal open onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/confirmation/i), {
      target: { value: 'not the phrase' },
    });
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    expect(await screen.findByText(/confirmation/i)).toBeInTheDocument();
  });

  it('accepts a confirmation phrase that differs only in case', async () => {
    const onClose = vi.fn();
    render(<DeleteAccountModal open onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/confirmation/i), {
      target: { value: 'delete my account' },
    });
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await waitFor(() => {
      expect(screen.queryByText(/confirmation/i)).not.toBeInTheDocument();
    });
  });

  it('accepts a confirmation phrase with leading and trailing whitespace', async () => {
    const onClose = vi.fn();
    render(<DeleteAccountModal open onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/confirmation/i), {
      target: { value: '  DELETE MY ACCOUNT  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await waitFor(() => {
      expect(screen.queryByText(/confirmation/i)).not.toBeInTheDocument();
    });
  });
});
