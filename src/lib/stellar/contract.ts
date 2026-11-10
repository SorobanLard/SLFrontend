/**
 * lib/stellar/contract.ts
 * Soroban contract calls for SorobanLard.
 * Students call enroll() to pay and get access.
 * Instructors call register_course() when submitting for review.
 */

import {
  Networks, SorobanRpc, Contract, TransactionBuilder,
  BASE_FEE, nativeToScVal, xdr, Address,
} from '@stellar/stellar-sdk';
import { getWalletNetwork, signTx } from './freighter';

const RPC_URL     = process.env.NEXT_PUBLIC_STELLAR_RPC_URL!;
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const NETWORK     = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet';
const PASSPHRASE  = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

export type StellarNetworkName = 'TESTNET' | 'PUBLIC';

export class WrongNetworkError extends Error {
  readonly expectedNetwork: StellarNetworkName;
  readonly actualNetwork: string;

  constructor(expectedNetwork: StellarNetworkName, actualNetwork: string) {
    const expectedLabel = expectedNetwork === 'PUBLIC' ? 'Mainnet (PUBLIC)' : 'Testnet (TESTNET)';
    const normalizedActual = actualNetwork.trim().toUpperCase();
    const actualLabel =
      normalizedActual === 'PUBLIC' || normalizedActual === 'MAINNET'
        ? 'Mainnet (PUBLIC)'
        : actualNetwork || 'an unsupported network';
    super(
      `Wrong network selected in Freighter: wallet is connected to ${actualLabel}, but SorobanLard requires ${expectedLabel}. Please switch Freighter to ${expectedLabel} and try again.`,
    );
    this.name = 'WrongNetworkError';
    this.expectedNetwork = expectedNetwork;
    this.actualNetwork = actualNetwork;
  }
}

export function getExpectedFreighterNetwork(
  configuredNetwork: string = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? NETWORK,
): StellarNetworkName {
  const normalized = configuredNetwork.trim().toLowerCase();
  return normalized === 'mainnet' || normalized === 'public' ? 'PUBLIC' : 'TESTNET';
}

/**
 * Verifies that Freighter is connected to the expected Stellar network before
 * building or signing a Soroban transaction. Throws `WrongNetworkError` with
 * actionable guidance when a mismatch (e.g. Mainnet vs Testnet) is detected.
 */
export async function verifyFreighterNetwork(
  expectedNetwork: StellarNetworkName = getExpectedFreighterNetwork(),
): Promise<StellarNetworkName> {
  const rawNetwork = await getWalletNetwork();
  const normalized = (rawNetwork ?? '').trim().toUpperCase();

  const isExpected =
    expectedNetwork === 'TESTNET'
      ? normalized === 'TESTNET' || normalized === Networks.TESTNET.toUpperCase()
      : normalized === 'PUBLIC' ||
        normalized === 'MAINNET' ||
        normalized === Networks.PUBLIC.toUpperCase();

  if (!isExpected) {
    throw new WrongNetworkError(expectedNetwork, rawNetwork || 'UNKNOWN');
  }

  return expectedNetwork;
}

let _rpc: SorobanRpc.Server;
const getRpc = () => (_rpc ??= new SorobanRpc.Server(RPC_URL, { allowHttp: true }));

async function invokeContract(caller: string, method: string, args: xdr.ScVal[]): Promise<string> {
  await verifyFreighterNetwork();

  const rpc      = getRpc();
  const contract = new Contract(process.env.NEXT_PUBLIC_CONTRACT_ID || CONTRACT_ID);
  const account  = await rpc.getAccount(caller);

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) throw new Error(`Simulation: ${sim.error}`);

  const assembled = SorobanRpc.assembleTransaction(tx, sim).build();
  const signed    = await signTx(assembled.toXDR(), PASSPHRASE);

  const { Transaction } = await import('@stellar/stellar-sdk');
  const resp = await rpc.sendTransaction(new Transaction(signed, PASSPHRASE));
  if (resp.status === 'ERROR') throw new Error('Submission failed');

  return waitForTx(resp.hash);
}

async function waitForTx(hash: string): Promise<string> {
  const rpc = getRpc();
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await rpc.getTransaction(hash);
    if (r.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return hash;
    if (r.status === SorobanRpc.Api.GetTransactionStatus.FAILED)
      throw new Error(`Transaction failed: ${hash}`);
  }
  throw new Error('Transaction not confirmed');
}

/**
 * Student enrolls in a course and pays the fee.
 * Payment is split automatically: platform fee to treasury, remainder to instructor.
 *
 * Resolves with the transaction hash once the transaction is confirmed on-chain.
 *
 * Rejects with an `Error` whose message says which step failed:
 * - `Simulation: <reason>` when the contract rejects the call. Signing has not been requested yet.
 * - `Submission failed` when the RPC server rejects the signed transaction.
 * - `Transaction failed: <hash>` when the transaction is included but fails on-chain.
 * - `Transaction not confirmed` when it is still pending after about 40 seconds. It may still
 *   succeed, so look up the hash before retrying, or the learner could be charged twice.
 *
 * Errors from the wallet (for example the user declining to sign) and from RPC requests
 * propagate unchanged. Throws if `callerAddress` is not a valid Stellar address.
 */
export async function enrollInCourse(params: {
  callerAddress: string;
  courseId: string;
}): Promise<string> {
  return invokeContract(params.callerAddress, 'enroll', [
    new Address(params.callerAddress).toScVal(),
    nativeToScVal(params.courseId, { type: 'string' }),
  ]);
}

/**
 * Instructor registers a course on-chain (called before submitting for admin review).
 *
 * `price` is in the token's smallest unit. `platformFeePct` defaults to 0.
 * Resolves with the transaction hash and rejects in the same cases as `enrollInCourse`.
 */
export async function registerCourseOnChain(params: {
  callerAddress: string;
  courseId: string;
  price: bigint;
  tokenAddress: string;
  platformFeePct?: number;
}): Promise<string> {
  return invokeContract(params.callerAddress, 'register_course', [
    new Address(params.callerAddress).toScVal(),
    nativeToScVal(params.courseId, { type: 'string' }),
    nativeToScVal(params.price, { type: 'i128' }),
    new Address(params.tokenAddress).toScVal(),
    nativeToScVal(params.platformFeePct ?? 0, { type: 'u32' }),
  ]);
}
