import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getWalletNetworkMock,
  signTxMock,
  getAccountMock,
  simulateTransactionMock,
  sendTransactionMock,
  getTransactionMock,
} = vi.hoisted(() => ({
  getWalletNetworkMock: vi.fn(),
  signTxMock: vi.fn(),
  getAccountMock: vi.fn(),
  simulateTransactionMock: vi.fn(),
  sendTransactionMock: vi.fn(),
  getTransactionMock: vi.fn(),
}));

vi.mock('./freighter', () => ({
  getWalletNetwork: getWalletNetworkMock,
  signTx: signTxMock,
}));

vi.mock('@stellar/stellar-sdk', () => {
  class MockAddress {
    constructor(public value: string) {}
    toScVal() {
      return { address: this.value };
    }
  }
  class MockContract {
    constructor(public id: string) {}
    call(method: string, ...args: unknown[]) {
      return { method, args };
    }
  }
  class MockTransactionBuilder {
    constructor() {}
    addOperation() {
      return this;
    }
    setTimeout() {
      return this;
    }
    build() {
      return { toXDR: () => 'UNSIGNED-XDR' };
    }
  }
  class MockTransaction {
    constructor(public xdr: string, public passphrase: string) {}
  }

  return {
    Networks: {
      PUBLIC: 'Public Global Stellar Network ; September 2015',
      TESTNET: 'Test SDF Network ; September 2015',
    },
    BASE_FEE: '100',
    Address: MockAddress,
    Contract: MockContract,
    TransactionBuilder: MockTransactionBuilder,
    Transaction: MockTransaction,
    nativeToScVal: (val: unknown) => val,
    xdr: {},
    SorobanRpc: {
      Server: class {
        getAccount = getAccountMock;
        simulateTransaction = simulateTransactionMock;
        sendTransaction = sendTransactionMock;
        getTransaction = getTransactionMock;
      },
      Api: {
        isSimulationError: () => false,
        GetTransactionStatus: {
          SUCCESS: 'SUCCESS',
          FAILED: 'FAILED',
          NOT_FOUND: 'NOT_FOUND',
        },
      },
      assembleTransaction: () => ({
        build: () => ({ toXDR: () => 'ASSEMBLED-XDR' }),
      }),
    },
  };
});

import {
  assertExpectedWalletNetwork,
  enrollInCourse,
  registerCourseOnChain,
  WrongStellarNetworkError,
} from './contract';

const TEST_CALLER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const TEST_TOKEN = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

describe('Stellar contract network guard (Issue #213)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountMock.mockResolvedValue({ accountId: () => TEST_CALLER });
    simulateTransactionMock.mockResolvedValue({ id: 'sim-1' });
    signTxMock.mockResolvedValue('SIGNED-XDR');
    sendTransactionMock.mockResolvedValue({ status: 'PENDING', hash: 'tx-hash-123' });
    getTransactionMock.mockResolvedValue({ status: 'SUCCESS' });
  });

  it('blocks enrollment before building or signing a transaction when Freighter is on Mainnet (PUBLIC)', async () => {
    getWalletNetworkMock.mockResolvedValueOnce('PUBLIC');

    await expect(
      enrollInCourse({
        callerAddress: TEST_CALLER,
        courseId: 'COURSE-TAILOR-01',
      }),
    ).rejects.toThrow(WrongStellarNetworkError);

    expect(getAccountMock).not.toHaveBeenCalled();
    expect(simulateTransactionMock).not.toHaveBeenCalled();
    expect(signTxMock).not.toHaveBeenCalled();
  });

  it('includes a clear Mainnet vs Testnet warning message with retry instructions', async () => {
    getWalletNetworkMock.mockResolvedValueOnce('MAINNET');

    try {
      await assertExpectedWalletNetwork('testnet');
      expect.unreachable('Expected assertExpectedWalletNetwork to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(WrongStellarNetworkError);
      const netErr = error as WrongStellarNetworkError;
      expect(netErr.expectedNetwork).toBe('TESTNET');
      expect(netErr.actualNetwork).toBe('PUBLIC');
      expect(netErr.recoverable).toBe(true);
      expect(netErr.message).toMatch(/connected to Mainnet \(PUBLIC\)/i);
      expect(netErr.message).toMatch(/switch Freighter to Testnet and try again/i);
    }
  });

  it('allows the user to retry and succeed after switching Freighter from Mainnet to Testnet', async () => {
    vi.useFakeTimers();
    try {
      getWalletNetworkMock
        .mockResolvedValueOnce('PUBLIC')
        .mockResolvedValueOnce('TESTNET');

      await expect(
        registerCourseOnChain({
          callerAddress: TEST_CALLER,
          courseId: 'COURSE-BAKING-01',
          price: BigInt(500_000_000),
          tokenAddress: TEST_TOKEN,
        }),
      ).rejects.toThrow(WrongStellarNetworkError);

      const retryPromise = registerCourseOnChain({
        callerAddress: TEST_CALLER,
        courseId: 'COURSE-BAKING-01',
        price: BigInt(500_000_000),
        tokenAddress: TEST_TOKEN,
      });

      await vi.advanceTimersByTimeAsync(2500);
      await expect(retryPromise).resolves.toBe('tx-hash-123');
      expect(signTxMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
