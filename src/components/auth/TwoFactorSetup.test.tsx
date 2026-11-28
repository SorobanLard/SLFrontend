import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwoFactorSetup } from './TwoFactorSetup';

// Mock the auth client so tests don't hit the network.
const mockEnable = vi.fn();
const mockVerifyTotp = vi.fn();

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    twoFactor: {
      enable: (...args: unknown[]) => mockEnable(...args),
      verifyTotp: (...args: unknown[]) => mockVerifyTotp(...args),
    },
  },
}));

// Mock the QR code renderer — jsdom can't render canvas/SVG QR codes.
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value} />
  ),
}));

describe('TwoFactorSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the initial setup step with a start button', () => {
    render(<TwoFactorSetup />);
    expect(
      screen.getByRole('button', { name: /enable two-factor|set up|get started/i })
    ).toBeInTheDocument();
  });

  it('shows the QR code and secret after enabling 2FA', async () => {
    mockEnable.mockResolvedValue({
      data: { totpURI: 'otpauth://totp/test?secret=ABC123', backupCodes: ['a', 'b'] },
    });

    render(<TwoFactorSetup />);
    fireEvent.click(
      screen.getByRole('button', { name: /enable two-factor|set up|get started/i })
    );

    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });
    expect(screen.getByTestId('qr-code')).toHaveAttribute(
      'data-value',
      'otpauth://totp/test?secret=ABC123'
    );
  });

  it('accepts a verification code and submits it', async () => {
    mockEnable.mockResolvedValue({
      data: { totpURI: 'otpauth://totp/test?secret=ABC123', backupCodes: [] },
    });
    mockVerifyTotp.mockResolvedValue({ data: { success: true } });

    render(<TwoFactorSetup />);
    fireEvent.click(
      screen.getByRole('button', { name: /enable two-factor|set up|get started/i })
    );

    const input = await screen.findByRole('textbox');
    fireEvent.change(input, { target: { value: '123456' } });
    expect(input).toHaveValue('123456');

    fireEvent.click(screen.getByRole('button', { name: /verify|confirm|submit/i }));

    await waitFor(() => {
      expect(mockVerifyTotp).toHaveBeenCalledWith({ code: '123456' });
    });
  });

  it('displays an error message when enabling fails', async () => {
    mockEnable.mockRejectedValue(new Error('Network error'));

    render(<TwoFactorSetup />);
    fireEvent.click(
      screen.getByRole('button', { name: /enable two-factor|set up|get started/i })
    );

    expect(await screen.findByText(/network error|something went wrong|failed/i)).toBeInTheDocument();
  });

  it('shows a loading state while enabling', async () => {
    let resolveEnable: (value: unknown) => void = () => {};
    mockEnable.mockReturnValue(
      new Promise((resolve) => {
        resolveEnable = resolve;
      })
    );

    render(<TwoFactorSetup />);
    fireEvent.click(
      screen.getByRole('button', { name: /enable two-factor|set up|get started/i })
    );

    expect(screen.getByRole('button', { name: /loading|enabling|please wait/i })).toBeDisabled();

    resolveEnable({ data: { totpURI: 'otpauth://totp/test?secret=ABC123', backupCodes: [] } });
    await waitFor(() => expect(screen.getByTestId('qr-code')).toBeInTheDocument());
  });
});
