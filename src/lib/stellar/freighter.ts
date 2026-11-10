import { isConnected, signTransaction, requestAccess, getNetwork, getPublicKey } from '@stellar/freighter-api';

export const FREIGHTER_REJECTION_MESSAGE =
  'Signature request was cancelled in Freighter. You can try again when ready.';

export const FREIGHTER_ACCESS_REJECTION_MESSAGE =
  'Wallet connection was cancelled in Freighter. You can try again when ready.';

const USER_REJECTION_PATTERN =
  /user\s+(declined|rejected|canceled|cancelled)|rejected\s+by\s+user|declined\s+access|request\s+rejected|cancel(led)?\s+by\s+user|user_rejected|declined\s+to\s+sign/i;

/**
 * Structured, recoverable error thrown when a learner or instructor clicks
 * "Reject" / "Cancel" in the Freighter popup during wallet connection or
 * transaction signing.
 */
export class FreighterRejectionError extends Error {
  readonly code = 'USER_REJECTED' as const;
  readonly recoverable = true as const;
  readonly cause?: unknown;

  constructor(message = FREIGHTER_REJECTION_MESSAGE, cause?: unknown) {
    super(message);
    this.name = 'FreighterRejectionError';
    this.cause = cause;
    Object.setPrototypeOf(this, FreighterRejectionError.prototype);
  }
}

function extractRawErrorMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const record = err as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
    if (record.error && typeof record.error === 'object') {
      const nested = record.error as Record<string, unknown>;
      if (typeof nested.message === 'string') return nested.message;
    }
  }
  return '';
}

/**
 * Returns `true` if `err` represents the user rejecting or cancelling a
 * Freighter prompt (whether thrown as an `Error`, rejected as a raw string,
 * or returned as an `{ error }` payload).
 */
export function isUserRejectionError(err: unknown): boolean {
  if (err instanceof FreighterRejectionError) return true;
  if (
    err &&
    typeof err === 'object' &&
    (err as { code?: unknown }).code === 'USER_REJECTED'
  ) {
    return true;
  }
  const message = extractRawErrorMessage(err);
  return USER_REJECTION_PATTERN.test(message);
}

/**
 * Normalizes any error thrown or returned by `@stellar/freighter-api` into an
 * `Error` instance with a clear `.message` so UI callers never fail silently
 * when Freighter rejects with a plain string or `{ error }` object.
 */
export function normalizeFreighterError(
  err: unknown,
  rejectionMessage = FREIGHTER_REJECTION_MESSAGE,
  fallbackMessage = 'Freighter wallet request failed. Please try again.',
): Error {
  if (err instanceof FreighterRejectionError) return err;
  if (isUserRejectionError(err)) {
    return new FreighterRejectionError(rejectionMessage, err);
  }
  if (err instanceof Error && err.message) {
    return err;
  }
  const extracted = extractRawErrorMessage(err).trim();
  return new Error(extracted || fallbackMessage);
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
 * Rejects with `FreighterRejectionError` (`recoverable: true`) if the user declines access.
 */
export async function connectFreighter(): Promise<string> {
  try {
    const accessResult = (await requestAccess()) as unknown;
    if (
      accessResult &&
      typeof accessResult === 'object' &&
      'error' in accessResult &&
      Boolean((accessResult as { error?: unknown }).error)
    ) {
      throw (accessResult as { error: unknown }).error;
    }
    return await getUserAddress();
  } catch (err) {
    throw normalizeFreighterError(err, FREIGHTER_ACCESS_REJECTION_MESSAGE);
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
 * Rejects with `FreighterRejectionError` (`code: 'USER_REJECTED'`, `recoverable: true`)
 * if the user clicks "Reject" in Freighter, or a normalized `Error` if Freighter fails.
 * The passphrase must match the network the transaction was built for.
 */
export async function signTx(xdr: string, networkPassphrase: string): Promise<string> {
  try {
    const result = (await signTransaction(xdr, { networkPassphrase })) as unknown;
    if (typeof result === 'string') {
      if (!result) {
        throw new FreighterRejectionError(FREIGHTER_REJECTION_MESSAGE);
      }
      return result;
    }
    if (result && typeof result === 'object') {
      const record = result as { signedTxXdr?: string; error?: unknown };
      if (record.error) {
        throw record.error;
      }
      if (typeof record.signedTxXdr === 'string' && record.signedTxXdr) {
        return record.signedTxXdr;
      }
    }
    throw new Error('Freighter did not return a signed transaction.');
  } catch (err) {
    throw normalizeFreighterError(err, FREIGHTER_REJECTION_MESSAGE);
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
