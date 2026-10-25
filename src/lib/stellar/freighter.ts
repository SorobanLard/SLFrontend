import { isConnected, signTransaction, requestAccess, getNetwork, getPublicKey } from '@stellar/freighter-api';

/** Resolves `false` instead of throwing when the Freighter extension is missing or unreachable. */
export async function isFreighterInstalled(): Promise<boolean> {
  try { return await isConnected(); }
  catch { return false; }
}

/**
 * Asks the user to grant this site access to Freighter, then resolves with the public key
 * of the selected account (a `G...` address).
 *
 * Errors from the Freighter API, including the user declining access, are not caught here.
 * Callers should handle rejection.
 */
export async function connectFreighter(): Promise<string> {
  await requestAccess();
  return getUserAddress();
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
 * Resolves with the signed XDR. Rejects if the user declines or Freighter fails.
 * The passphrase must match the network the transaction was built for.
 */
export async function signTx(xdr: string, networkPassphrase: string): Promise<string> {
  return await signTransaction(xdr, { networkPassphrase });
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
