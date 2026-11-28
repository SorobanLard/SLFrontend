import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isConnected: vi.fn(),
  signTransaction: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
  getPublicKey: vi.fn(),
  addOperation: vi.fn(),
  setTimeout: vi.fn(),
}));

vi.mock('@stellar/freighter-api', () => ({
  isConnected: mocks.isConnected,
  signTransaction: mocks.signTransaction,
  requestAccess: mocks.requestAccess,
  getNetwork: mocks.getNetwork,
  getPublicKey: mocks.getPublicKey,
}));

vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();

  class MockAccount {
    constructor(
      readonly address: string,
      readonly sequence: string,
    ) {}
  }

  class MockTransactionBuilder {
    addOperation(operation: unknown) {
      mocks.addOperation(operation);
      return this;
    }

    setTimeout(seconds: number) {
      mocks.setTimeout(seconds);
      return this;
    }

    build() {
      return { toXDR: () => 'nonce-xdr' };
    }
  }

  return {
    ...actual,
    Account: MockAccount,
    TransactionBuilder: MockTransactionBuilder,
  };
});

import * as freighterApi from '@stellar/freighter-api';
import {
  UserRejectedError,
  connectFreighter,
  getUserAddress,
  getWalletNetwork,
  isFreighterInstalled,
  signNonce,
  signTx,
} from './freighter';

const mockIsConnected = vi.mocked(freighterApi.isConnected);
const mockSignTransaction = vi.mocked(freighterApi.signTransaction);
const mockRequestAccess = vi.mocked(freighterApi.requestAccess);
const mockGetNetwork = vi.mocked(freighterApi.getNetwork);
const mockGetPublicKey = vi.mocked(freighterApi.getPublicKey);

const ADDRESS = 'GCL6KHXPXJTR47SMQQI7IGZBHPK7NRQAXLSJSLOQKGSL35RGOYN2JLUF';
const PASSPHRASE = 'Test SDF Network ; September 2015';

describe('Freighter utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UserRejectedError', () => {
    it('provides a named Error with rejection detail and retry guidance', () => {
      const error = new UserRejectedError('Signing was declined');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('UserRejectedError');
      expect(error.message).toContain('Signing was declined');
      expect(error.message).toMatch(/again/i);
    });
  });

  describe('isFreighterInstalled', () => {
    it('returns the extension connection status', async () => {
      mockIsConnected.mockResolvedValue(true);

      await expect(isFreighterInstalled()).resolves.toBe(true);
    });

    it('returns false when checking the extension fails', async () => {
      mockIsConnected.mockRejectedValue(new Error('Extension unavailable'));

      await expect(isFreighterInstalled()).resolves.toBe(false);
    });
  });

  describe('connectFreighter', () => {
    it('requests access and returns the selected wallet address', async () => {
      mockRequestAccess.mockResolvedValue(undefined);
      mockGetPublicKey.mockResolvedValue(ADDRESS);

      await expect(connectFreighter()).resolves.toBe(ADDRESS);
      expect(mockRequestAccess).toHaveBeenCalledOnce();
      expect(mockGetPublicKey).toHaveBeenCalledOnce();
    });

    it('normalizes a declined access request to UserRejectedError', async () => {
      mockRequestAccess.mockRejectedValue('User declined access');

      await expect(connectFreighter()).rejects.toBeInstanceOf(UserRejectedError);
      expect(mockGetPublicKey).not.toHaveBeenCalled();
    });
  });

  describe('getUserAddress', () => {
    it('returns the currently selected public key', async () => {
      mockGetPublicKey.mockResolvedValue(ADDRESS);

      await expect(getUserAddress()).resolves.toBe(ADDRESS);
    });

    it('propagates public-key lookup errors', async () => {
      const error = new Error('No wallet account selected');
      mockGetPublicKey.mockRejectedValue(error);

      await expect(getUserAddress()).rejects.toBe(error);
    });
  });

  describe('getWalletNetwork', () => {
    it('returns the network reported by Freighter', async () => {
      mockGetNetwork.mockResolvedValue('TESTNET');

      await expect(getWalletNetwork()).resolves.toBe('TESTNET');
    });

    it('propagates network lookup errors', async () => {
      const error = new Error('Network unavailable');
      mockGetNetwork.mockRejectedValue(error);

      await expect(getWalletNetwork()).rejects.toBe(error);
    });
  });

  describe('signTx', () => {
    it('returns the signed XDR and passes the network passphrase', async () => {
      mockSignTransaction.mockResolvedValue('signed-xdr');

      await expect(signTx('unsigned-xdr', PASSPHRASE)).resolves.toBe('signed-xdr');
      expect(mockSignTransaction).toHaveBeenCalledWith('unsigned-xdr', {
        networkPassphrase: PASSPHRASE,
      });
    });

    it('normalizes a user rejection from the signing request', async () => {
      mockSignTransaction.mockRejectedValue('Transaction was rejected');

      await expect(signTx('unsigned-xdr', PASSPHRASE)).rejects.toBeInstanceOf(
        UserRejectedError,
      );
    });
  });

  describe('signNonce', () => {
    it('builds and signs a nonce transaction', async () => {
      mockGetPublicKey.mockResolvedValue(ADDRESS);
      mockSignTransaction.mockResolvedValue('signed-nonce-xdr');

      await expect(signNonce('nonce-value', PASSPHRASE)).resolves.toBe('signed-nonce-xdr');

      expect(mocks.addOperation).toHaveBeenCalledOnce();
      expect(mocks.setTimeout).toHaveBeenCalledWith(30);
      expect(mockSignTransaction).toHaveBeenCalledWith('nonce-xdr', {
        networkPassphrase: PASSPHRASE,
      });
    });

    it('accepts a 64-byte nonce and rejects a 65-byte nonce', async () => {
      mockGetPublicKey.mockResolvedValue(ADDRESS);
      mockSignTransaction.mockResolvedValue('signed-nonce-xdr');

      await expect(signNonce('x'.repeat(64), PASSPHRASE)).resolves.toBe('signed-nonce-xdr');
      await expect(signNonce('x'.repeat(65), PASSPHRASE)).rejects.toThrow();
      expect(mocks.addOperation).toHaveBeenCalledOnce();
      expect(mockSignTransaction).toHaveBeenCalledOnce();
    });
  });
});
