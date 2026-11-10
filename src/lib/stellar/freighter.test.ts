import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectFreighter,
  FREIGHTER_ACCESS_REJECTION_MESSAGE,
  FREIGHTER_REJECTION_MESSAGE,
  FreighterRejectionError,
  isUserRejectionError,
  signTx,
} from './freighter';

const mockSignTransaction = vi.fn();
const mockRequestAccess = vi.fn();
const mockGetPublicKey = vi.fn();

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  signTransaction: (...args: unknown[]) => mockSignTransaction(...args),
  requestAccess: (...args: unknown[]) => mockRequestAccess(...args),
  getPublicKey: (...args: unknown[]) => mockGetPublicKey(...args),
  getNetwork: vi.fn(),
}));

describe('Freighter user rejection handling (#215)', () => {
  beforeEach(() => {
    mockSignTransaction.mockReset();
    mockRequestAccess.mockReset();
    mockGetPublicKey.mockReset();
  });

  it('converts a rejected string from signTransaction into a recoverable FreighterRejectionError', async () => {
    mockSignTransaction.mockRejectedValueOnce('User declined access');

    await expect(signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015')).rejects.toMatchObject({
      name: 'FreighterRejectionError',
      code: 'USER_REJECTED',
      recoverable: true,
      message: FREIGHTER_REJECTION_MESSAGE,
    });
  });

  it('converts an Error("User rejected") or { error } payload from signTransaction into FreighterRejectionError', async () => {
    mockSignTransaction.mockRejectedValueOnce(new Error('Request rejected by user'));

    try {
      await signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015');
      expect.unreachable('Should have rejected');
    } catch (err) {
      expect(err).toBeInstanceOf(FreighterRejectionError);
      expect(isUserRejectionError(err)).toBe(true);
      expect((err as FreighterRejectionError).recoverable).toBe(true);
      expect((err as Error).message).toBe(FREIGHTER_REJECTION_MESSAGE);
    }

    mockSignTransaction.mockResolvedValueOnce({ error: 'User declined access' });
    await expect(signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015')).rejects.toThrow(
      FreighterRejectionError,
    );
  });

  it('allows the user to retry and succeed after rejecting the Freighter signing prompt', async () => {
    mockSignTransaction
      .mockRejectedValueOnce('User declined access')
      .mockResolvedValueOnce('AAAA-SIGNED-XDR');

    await expect(signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015')).rejects.toThrow(
      FREIGHTER_REJECTION_MESSAGE,
    );

    const signedXdr = await signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015');
    expect(signedXdr).toBe('AAAA-SIGNED-XDR');
    expect(mockSignTransaction).toHaveBeenCalledTimes(2);
  });

  it('surfaces a recoverable FreighterRejectionError when the user declines connectFreighter()', async () => {
    mockRequestAccess.mockRejectedValueOnce('User declined access');

    await expect(connectFreighter()).rejects.toMatchObject({
      name: 'FreighterRejectionError',
      code: 'USER_REJECTED',
      recoverable: true,
      message: FREIGHTER_ACCESS_REJECTION_MESSAGE,
    });

    mockRequestAccess.mockResolvedValueOnce('GABC1234567890');
    mockGetPublicKey.mockResolvedValueOnce('GABC1234567890');

    await expect(connectFreighter()).resolves.toBe('GABC1234567890');
  });

  it('preserves non-rejection errors as standard Error instances', async () => {
    mockSignTransaction.mockRejectedValueOnce(new Error('Network passphrase mismatch'));

    try {
      await signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015');
      expect.unreachable('Should have rejected');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(FreighterRejectionError);
      expect(isUserRejectionError(err)).toBe(false);
      expect((err as Error).message).toBe('Network passphrase mismatch');
    }
  });
});
