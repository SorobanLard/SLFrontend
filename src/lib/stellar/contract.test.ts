import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getWalletNetwork: vi.fn(),
  signTx: vi.fn(),
  getAccount: vi.fn(),
  simulateTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  contractCall: vi.fn(),
  addressToScVal: vi.fn((value: string) => ({ kind: 'address', value })),
  nativeToScVal: vi.fn((value: string | bigint | number, options: { type: string }) => ({
    kind: 'native',
    value,
    type: options.type,
  })),
  isSimulationError: vi.fn(),
  assembleTransaction: vi.fn(),
  UserRejectedError: class UserRejectedError extends Error {},
}));

vi.mock('./freighter', () => ({
  getWalletNetwork: mocks.getWalletNetwork,
  signTx: mocks.signTx,
  UserRejectedError: mocks.UserRejectedError,
}));

vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();

  class MockAddress {
    constructor(private readonly value: string) {
      if (!value.startsWith('G') || value.length !== 56) {
        throw new Error('Invalid Stellar address');
      }
    }

    toScVal() {
      return mocks.addressToScVal(this.value);
    }
  }

  class MockContract {
    constructor(_contractId: string) {}

    call(method: string, ...args: unknown[]) {
      return mocks.contractCall(method, ...args);
    }
  }

  class MockTransactionBuilder {
    addOperation(_operation: unknown) {
      return this;
    }

    setTimeout(_seconds: number) {
      return this;
    }

    build() {
      return { toXDR: () => 'built-xdr' };
    }
  }

  class MockServer {
    getAccount(...args: unknown[]) {
      return mocks.getAccount(...args);
    }

    simulateTransaction(...args: unknown[]) {
      return mocks.simulateTransaction(...args);
    }

    sendTransaction(...args: unknown[]) {
      return mocks.sendTransaction(...args);
    }

    getTransaction(...args: unknown[]) {
      return mocks.getTransaction(...args);
    }
  }

  return {
    ...actual,
    Address: MockAddress,
    Contract: MockContract,
    TransactionBuilder: MockTransactionBuilder,
    nativeToScVal: mocks.nativeToScVal,
    SorobanRpc: {
      ...actual.SorobanRpc,
      Server: MockServer,
      Api: {
        ...actual.SorobanRpc.Api,
        isSimulationError: mocks.isSimulationError,
      },
      assembleTransaction: mocks.assembleTransaction,
    },
    Transaction: class MockTransaction {
      constructor(
        readonly signedXdr: string,
        readonly networkPassphrase: string,
      ) {}
    },
  };
});

import * as freighter from './freighter';
import {
  assertCorrectNetwork,
  enrollInCourse,
  registerCourseOnChain,
  UserRejectedError as ContractUserRejectedError,
  WrongNetworkError,
} from './contract';
import { UserRejectedError as FreighterUserRejectedError } from './freighter';

const CALLER_ADDRESS = 'GCL6KHXPXJTR47SMQQI7IGZBHPK7NRQAXLSJSLOQKGSL35RGOYN2JLUF';
const TOKEN_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';

describe('Stellar contract utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWalletNetwork.mockResolvedValue('TESTNET');
    mocks.signTx.mockResolvedValue('signed-xdr');
    mocks.getAccount.mockResolvedValue({ id: CALLER_ADDRESS });
    mocks.simulateTransaction.mockResolvedValue({ result: 'simulated' });
    mocks.isSimulationError.mockReturnValue(false);
    mocks.assembleTransaction.mockReturnValue({
      build: () => ({ toXDR: () => 'assembled-xdr' }),
    });
    mocks.sendTransaction.mockResolvedValue({ status: 'PENDING', hash: 'tx-hash' });
    mocks.getTransaction.mockResolvedValue({ status: 'SUCCESS' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('assertCorrectNetwork', () => {
    it('accepts a case-insensitive match with the configured network', async () => {
      mocks.getWalletNetwork.mockResolvedValue('testnet');

      await expect(assertCorrectNetwork()).resolves.toBeUndefined();
    });

    it('throws a WrongNetworkError containing both network names on mismatch', async () => {
      mocks.getWalletNetwork.mockResolvedValue('PUBLIC');

      await expect(assertCorrectNetwork()).rejects.toMatchObject({
        name: 'WrongNetworkError',
        walletNetwork: 'PUBLIC',
        expectedNetwork: 'TESTNET',
      });
    });

    it('propagates wallet network lookup failures', async () => {
      const error = new Error('Wallet unavailable');
      mocks.getWalletNetwork.mockRejectedValue(error);

      await expect(assertCorrectNetwork()).rejects.toBe(error);
    });
  });

  describe('enrollInCourse', () => {
    it('encodes the caller and course id, then resolves with the confirmed hash', async () => {
      vi.useFakeTimers();

      const result = enrollInCourse({
        callerAddress: CALLER_ADDRESS,
        courseId: 'course-42',
      });
      await vi.runAllTimersAsync();

      await expect(result).resolves.toBe('tx-hash');
      expect(mocks.contractCall).toHaveBeenCalledWith(
        'enroll',
        { kind: 'address', value: CALLER_ADDRESS },
        { kind: 'native', value: 'course-42', type: 'string' },
      );
      expect(mocks.signTx).toHaveBeenCalledWith('assembled-xdr', TESTNET_PASSPHRASE);
    });

    it('rejects an invalid caller address before contacting the wallet', async () => {
      await expect(
        enrollInCourse({ callerAddress: 'invalid-address', courseId: 'course-42' }),
      ).rejects.toThrow('Invalid Stellar address');

      expect(mocks.getWalletNetwork).not.toHaveBeenCalled();
    });

    it('surfaces contract simulation failures without requesting a signature', async () => {
      mocks.isSimulationError.mockReturnValue(true);
      mocks.simulateTransaction.mockResolvedValue({ error: 'Course is unavailable' });

      await expect(
        enrollInCourse({ callerAddress: CALLER_ADDRESS, courseId: 'course-42' }),
      ).rejects.toThrow('Simulation: Course is unavailable');
      expect(mocks.signTx).not.toHaveBeenCalled();
    });
  });

  describe('registerCourseOnChain', () => {
    it('encodes the course registration fields and defaults the platform fee to zero', async () => {
      vi.useFakeTimers();

      const result = registerCourseOnChain({
        callerAddress: CALLER_ADDRESS,
        courseId: 'course-84',
        price: 25000000n,
        tokenAddress: TOKEN_ADDRESS,
      });
      await vi.runAllTimersAsync();

      await expect(result).resolves.toBe('tx-hash');
      expect(mocks.contractCall).toHaveBeenCalledWith(
        'register_course',
        { kind: 'address', value: CALLER_ADDRESS },
        { kind: 'native', value: 'course-84', type: 'string' },
        { kind: 'native', value: 25000000n, type: 'i128' },
        { kind: 'address', value: TOKEN_ADDRESS },
        { kind: 'native', value: 0, type: 'u32' },
      );
    });

    it('rejects an invalid token address before contacting the wallet', async () => {
      await expect(
        registerCourseOnChain({
          callerAddress: CALLER_ADDRESS,
          courseId: 'course-84',
          price: 25000000n,
          tokenAddress: 'invalid-address',
        }),
      ).rejects.toThrow('Invalid Stellar address');

      expect(mocks.getWalletNetwork).not.toHaveBeenCalled();
    });

    it('passes through an explicitly configured platform fee', async () => {
      vi.useFakeTimers();

      const result = registerCourseOnChain({
        callerAddress: CALLER_ADDRESS,
        courseId: 'course-84',
        price: 25000000n,
        tokenAddress: TOKEN_ADDRESS,
        platformFeePct: 12,
      });
      await vi.runAllTimersAsync();

      await expect(result).resolves.toBe('tx-hash');
      expect(mocks.nativeToScVal).toHaveBeenCalledWith(12, { type: 'u32' });
    });
  });

  it('re-exports UserRejectedError from the Freighter wrapper', () => {
    expect(ContractUserRejectedError).toBe(freighter.UserRejectedError);
    expect(ContractUserRejectedError).toBe(FreighterUserRejectedError);
    expect(new WrongNetworkError('PUBLIC', 'TESTNET')).toBeInstanceOf(Error);
  });
});
