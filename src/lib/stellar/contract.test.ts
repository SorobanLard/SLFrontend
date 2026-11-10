import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAccountMock,
  simulateTransactionMock,
  sendTransactionMock,
  getTransactionMock,
  assembleBuildMock,
  getWalletNetworkMock,
  signTxMock,
} = vi.hoisted(() => ({
  getAccountMock: vi.fn(),
  simulateTransactionMock: vi.fn(),
  sendTransactionMock: vi.fn(),
  getTransactionMock: vi.fn(),
  assembleBuildMock: vi.fn(() => ({ toXDR: () => 'assembled-xdr' })),
  getWalletNetworkMock: vi.fn(),
  signTxMock: vi.fn(),
}));

vi.mock('./freighter', () => ({
  getWalletNetwork: getWalletNetworkMock,
  signTx: signTxMock,
}));

vi.mock('@stellar/stellar-sdk', () => {
  class MockAddress {
    constructor(public readonly value: string) {}
    toScVal() {
      return { type: 'address', value: this.value };
    }
  }

  class MockContract {
    constructor(public readonly contractId: string) {}
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
      return { toXDR: () => 'unsigned-xdr' };
    }
  }

  class MockTransaction {
    constructor(
      public readonly xdr: string,
      public readonly passphrase: string,
    ) {}
  }

  class MockServer {
    getAccount = getAccountMock;
    simulateTransaction = simulateTransactionMock;
    sendTransaction = sendTransactionMock;
    getTransaction = getTransactionMock;
  }

  return {
    Networks: {
      TESTNET: 'Test SDF Network ; September 2015',
      PUBLIC: 'Public Global Stellar Network ; September 2015',
    },
    BASE_FEE: '100',
    Address: MockAddress,
    Contract: MockContract,
    TransactionBuilder: MockTransactionBuilder,
    Transaction: MockTransaction,
    nativeToScVal: (value: unknown, opts?: unknown) => ({ value, opts }),
    xdr: {},
    SorobanRpc: {
      Server: MockServer,
      Api: {
        isSimulationError: (sim: { error?: string }) => Boolean(sim?.error),
        GetTransactionStatus: {
          SUCCESS: 'SUCCESS',
          FAILED: 'FAILED',
          NOT_FOUND: 'NOT_FOUND',
        },
      },
      assembleTransaction: () => ({
        build: assembleBuildMock,
      }),
    },
  };
});

import {
  WrongNetworkError,
  enrollInCourse,
  registerCourseOnChain,
  verifyFreighterNetwork,
} from './contract';

describe('Stellar contract wrong-network guard (#213)', () => {
  const callerAddress = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ2345672345672345672345672345';

  beforeEach(() => {
    vi.clearAllMocks();
    getAccountMock.mockResolvedValue({ accountId: () => callerAddress });
    simulateTransactionMock.mockResolvedValue({ result: {} });
    signTxMock.mockResolvedValue('signed-xdr');
    sendTransactionMock.mockResolvedValue({ status: 'PENDING', hash: 'tx-hash-123' });
    getTransactionMock.mockResolvedValue({ status: 'SUCCESS' });
  });

  it('throws WrongNetworkError with actionable Testnet switch instructions when Freighter is on Mainnet (PUBLIC)', async () => {
    getWalletNetworkMock.mockResolvedValue('PUBLIC');

    await expect(verifyFreighterNetwork()).rejects.toThrow(WrongNetworkError);
    await expect(verifyFreighterNetwork()).rejects.toThrow(
      /Wrong network selected in Freighter: wallet is connected to Mainnet \(PUBLIC\), but SorobanLard requires Testnet \(TESTNET\)\. Please switch Freighter to Testnet \(TESTNET\) and try again\./,
    );
  });

  it('blocks enrollInCourse before RPC simulation or signing when Freighter is connected to PUBLIC', async () => {
    getWalletNetworkMock.mockResolvedValue('PUBLIC');

    await expect(
      enrollInCourse({
        callerAddress,
        courseId: 'course-101',
      }),
    ).rejects.toThrow(WrongNetworkError);

    expect(getAccountMock).not.toHaveBeenCalled();
    expect(simulateTransactionMock).not.toHaveBeenCalled();
    expect(signTxMock).not.toHaveBeenCalled();
    expect(sendTransactionMock).not.toHaveBeenCalled();
  });

  it('blocks registerCourseOnChain when Freighter is connected to PUBLIC', async () => {
    getWalletNetworkMock.mockResolvedValue('PUBLIC');

    await expect(
      registerCourseOnChain({
        callerAddress,
        courseId: 'course-101',
        price: 10000000n,
        tokenAddress: callerAddress,
      }),
    ).rejects.toThrow(WrongNetworkError);

    expect(signTxMock).not.toHaveBeenCalled();
  });

  it('allows the user to retry and succeed after switching Freighter from PUBLIC to TESTNET', async () => {
    getWalletNetworkMock.mockResolvedValueOnce('PUBLIC');

    await expect(
      enrollInCourse({
        callerAddress,
        courseId: 'course-101',
      }),
    ).rejects.toThrow(/Please switch Freighter to Testnet \(TESTNET\) and try again/i);

    // User switches Freighter to TESTNET and retries
    getWalletNetworkMock.mockResolvedValueOnce('TESTNET');

    const txHash = await enrollInCourse({
      callerAddress,
      courseId: 'course-101',
    });

    expect(txHash).toBe('tx-hash-123');
    expect(getAccountMock).toHaveBeenCalledWith(callerAddress);
    expect(simulateTransactionMock).toHaveBeenCalledTimes(1);
    expect(signTxMock).toHaveBeenCalledTimes(1);
    expect(sendTransactionMock).toHaveBeenCalledTimes(1);
  });
});
