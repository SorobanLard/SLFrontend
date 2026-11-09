import { isConnected, signTransaction, requestAccess, getNetwork, getPublicKey } from '@stellar/freighter-api';

export const FREIGHTER_REJECTION_MESSAGE =
  'Transaction signature was rejected in Freighter. You have not been charged — please try again when ready to sign.';

export const FREIGHTER_ACCESS_REJECTION_MESSAGE =
  'Wallet connection was declined in Freighter. Please approve the prompt and try again.';

const REJECTION_PATTERN =
  /user\s+declined|declined\s+access|user\s+rejected|rejected\s+by\s+user|request\s+declined|transaction\s+declined|cancelled|canceled|denied|user_rejected|4001/i;

export class FreighterRejectionError extends Error {
  readonly code = 'USER_REJECTED' as const;
  readonly recoverable = true as const;
  readonly retryable = true as const;
  readonly cause?: unknown;

  constructor(message = FREIGHTER_REJECTION_MESSAGE, cause?: unknown) {
    super(message);
    this.name = 'FreighterRejectionError';
    this.cause = cause;
  }
}

function extractRawErrorText(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const candidate = record.error ?? record.message ?? record.code;
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return String(candidate);
    }
  }
  return '';
}

/**
 * Returns `true` when `error` represents the user clicking "Reject" / "Decline"
 * in the Freighter signing or access prompt.
 */
export function isFreighterRejectionError(error: unknown): boolean {
  if (error instanceof FreighterRejectionError) return true;
  const text = extractRawErrorText(error);
  return REJECTION_PATTERN.test(text);
}

/**
 * Formats any Freighter error into a clear, user-facing recoverable message.
 */
export function getFreighterErrorMessage(
  error: unknown,
  fallback = 'Wallet request failed. Please try again.',
): string {
  if (error instanceof FreighterRejectionError) {
    return error.message;
  }
  if (isFreighterRejectionError(error)) {
    return FREIGHTER_REJECTION_MESSAGE;
  }
  const text = extractRawErrorText(error).trim();
  return text || fallback;
}

/** Resolves `false` instead of throwing when the Freighter extension is missing or unreachable. */
export async function isFreighterInstalled(): Promise<boolean> {
  try { return await isConnected(); }
  catch { return false; }
}

/**
 * Asks the user to grant this site access to Freighter, then resolves with the public key
 * of the selected account (a `G...` address).
 *
 * Throws `FreighterRejectionError` with a recoverable message if the user declines access.
 */
export async function connectFreighter(): Promise<string> {
  try {
    const accessResult = (await requestAccess()) as unknown;
    if (
      accessResult &&
      typeof accessResult === 'object' &&
      'error' in (accessResult as Record<string, unknown>) &&
      (accessResult as Record<string, unknown>).error
    ) {
      throw (accessResult as Record<string, unknown>).error;
    }

    const address =
      typeof accessResult === 'string' && accessResult.trim()
        ? accessResult
        : await getUserAddress();

    if (!address || typeof address !== 'string' || !address.trim()) {
      throw new FreighterRejectionError(FREIGHTER_ACCESS_REJECTION_MESSAGE);
    }

    return address;
  } catch (error) {
    if (error instanceof FreighterRejectionError) {
      throw error;
    }
    if (isFreighterRejectionError(error)) {
      throw new FreighterRejectionError(FREIGHTER_ACCESS_REJECTION_MESSAGE, error);
    }
    throw error instanceof Error ? error : new Error(getFreighterErrorMessage(error));
  }
}

/** Resolves with the public key (`G...`) of the account currently selected in Freighter. */
export async function getUserAddress(): Promise<string> {
  return await getPublicKey();
}

/** Resolves with the network name Freighter is set to, such as `TESTNET` or `PUBLIC`. */
export async function getWalletNetwork(): Promise<string> {
  return await getNetwork();
}

/**
 * Asks Freighter to sign a transaction envelope (base64 XDR) for `networkPassphrase`.
 * Resolves with the signed XDR.
 * Rejects with `FreighterRejectionError` when the user clicks "Reject" in Freighter so callers
 * can display a clear, recoverable message and allow immediate retry.
 */
export async function signTx(xdr: string, networkPassphrase: string): Promise<string> {
  try {
    const result = (await signTransaction(xdr, { networkPassphrase })) as unknown;

    if (result && typeof result === 'object') {
      const record = result as Record<string, unknown>;
      if (record.error) {
        throw record.error;
      }
      if (typeof record.signedTxXdr === 'string' && record.signedTxXdr.trim()) {
        return record.signedTxXdr;
      }
    }

    if (typeof result !== 'string' || !result.trim()) {
      throw new FreighterRejectionError(FREIGHTER_REJECTION_MESSAGE);
    }

    return result;
  } catch (error) {
    if (error instanceof FreighterRejectionError) {
      throw error;
    }
    if (isFreighterRejectionError(error)) {
      throw new FreighterRejectionError(FREIGHTER_REJECTION_MESSAGE, error);
    }
    throw error instanceof Error ? error : new Error(getFreighterErrorMessage(error));
  }
}

/**
 * Signs a one-operation transaction that stores `nonce` under the `sorobanlard_nonce` data key.
 * This proves the user controls the wallet without submitting anything to the network.
 *
 * Resolves with the signed XDR. Throws if `nonce` is longer than 64 bytes, the limit on a
 * `manageData` value. Wallet errors propagate as in `signTx`.
 */
export async function signNonce(nonce: string, networkPassphrase: string): Promise<string> {
  const { TransactionBuilder, BASE_FEE, Operation, Account } = await import('@stellar/stellar-sdk');
  const address = await getUserAddress();

  // A minimal sequence-0 account used only to build the nonce transaction;
  // it is never submitted to the network, so the sequence number does not matter.
  const dummyAccount = new Account(address, '0');

  const tx = new TransactionBuilder(dummyAccount, { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.manageData({ name: 'sorobanlard_nonce', value: Buffer.from(nonce) }))
    .setTimeout(30)
    .build();

  return signTx(tx.toXDR(), networkPassphrase);
}
