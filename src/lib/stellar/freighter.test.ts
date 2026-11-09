import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isConnected,
  signTransaction,
  requestAccess,
  getPublicKey,
} from '@stellar/freighter-api';
import {
  connectFreighter,
  signTx,
  FreighterRejectionError,
  FREIGHTER_REJECTION_MESSAGE,
  FREIGHTER_ACCESS_REJECTION_MESSAGE,
  isFreighterRejectionError,
  getFreighterErrorMessage,
  isFreighterInstalled,
} from './freighter';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  signTransaction: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
  getPublicKey: vi.fn(),
}));

describe('Freighter wallet rejection handling (Issue #215)', () => {
  const signTransactionMock = vi.mocked(signTransaction);
  const requestAccessMock = vi.mocked(requestAccess);
  const getPublicKeyMock = vi.mocked(getPublicKey);
  const isConnectedMock = vi.mocked(isConnected);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws a recoverable FreighterRejectionError when the user declines signing in Freighter', async () => {
    signTransactionMock.mockRejectedValueOnce(new Error('User declined access'));

    await expect(signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015')).rejects.toThrow(
      FreighterRejectionError,
    );

    signTransactionMock.mockRejectedValueOnce('User rejected the request');

    try {
      await signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015');
      expect.unreachable('signTx should have rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(FreighterRejectionError);
      expect(isFreighterRejectionError(error)).toBe(true);
      expect((error as FreighterRejectionError).recoverable).toBe(true);
      expect((error as FreighterRejectionError).retryable).toBe(true);
      expect((error as FreighterRejectionError).message).toBe(FREIGHTER_REJECTION_MESSAGE);
      expect(getFreighterErrorMessage(error)).toContain('You have not been charged');
    }
  });

  it('handles Freighter API object responses containing a user rejection error', async () => {
    signTransactionMock.mockResolvedValueOnce({ error: 'User declined access' } as unknown as string);

    await expect(signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015')).rejects.toMatchObject({
      name: 'FreighterRejectionError',
      code: 'USER_REJECTED',
      recoverable: true,
      retryable: true,
      message: FREIGHTER_REJECTION_MESSAGE,
    });
  });

  it('allows immediate recovery and succeeds when the user retries signing after a rejection', async () => {
    signTransactionMock
      .mockRejectedValueOnce(new Error('Transaction declined by user'))
      .mockResolvedValueOnce('AAAA-SIGNED-XDR');

    await expect(signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015')).rejects.toThrow(
      FREIGHTER_REJECTION_MESSAGE,
    );

    const signed = await signTx('AAAA-UNSIGNED-XDR', 'Test SDF Network ; September 2015');
    expect(signed).toBe('AAAA-SIGNED-XDR');
    expect(signTransactionMock).toHaveBeenCalledTimes(2);
  });

  it('throws a recoverable FreighterRejectionError when connectFreighter access is declined and recovers on retry', async () => {
    requestAccessMock
      .mockRejectedValueOnce(new Error('User declined access'))
      .mockResolvedValueOnce('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H');
    getPublicKeyMock.mockResolvedValue('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H');

    await expect(connectFreighter()).rejects.toThrow(FREIGHTER_ACCESS_REJECTION_MESSAGE);

    const address = await connectFreighter();
    expect(address).toBe('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H');
  });

  it('returns false from isFreighterInstalled when extension check throws', async () => {
    isConnectedMock.mockRejectedValueOnce(new Error('Extension unavailable'));
    await expect(isFreighterInstalled()).resolves.toBe(false);
  });
});
