import { isConnected, signTransaction, requestAccess, getNetwork, getPublicKey } from '@stellar/freighter-api';

export async function isFreighterInstalled(): Promise<boolean> {
  try { return await isConnected(); }
  catch { return false; }
}

export async function connectFreighter(): Promise<string> {
  await requestAccess();
  return getUserAddress();
}

export async function getUserAddress(): Promise<string> {
  return await getPublicKey();
}

export async function getWalletNetwork(): Promise<string> {
  return await getNetwork();
}

export async function signTx(xdr: string, networkPassphrase: string): Promise<string> {
  return await signTransaction(xdr, { networkPassphrase });
}

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
