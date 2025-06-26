// extension/lib/auth.ts
import { connect } from "@argent/get-starknet"; // CORRECTED IMPORT
import { AccountInterface, SignerInterface } from "starknet";

export interface AuthState {
  address: string;
  signature: string; // The signed nonce, valid for this session
}

/**
 * Connects to any injected Starknet wallet (e.g., Argent X, Braavos).
 * @returns The connected Starknet account interface.
 * @throws If no wallet is found or the user rejects the connection.
 */
export async function connectWallet(): Promise<AccountInterface> {
  // Use the connect function directly
  const starknet = await connect({
    dappName: "ContextVault",
    modalMode: "alwaysAsk", // Always show wallet selection list
    modalTheme: "dark", // Match your dark theme
  });

  if (!starknet) {
    throw new Error(
      "Wallet connection cancelled or no Starknet wallet found. Please install Argent X or Braavos."
    );
  }

  await starknet.enable({ starknetVersion: "v5" }); // Ensure v5 API is enabled

  if (!starknet.isConnected || !starknet.account) {
    throw new Error("Wallet connection failed or was rejected by the user.");
  }

  return starknet.account;
}

/**
 * Ensures the user has an active, signed session.
 * If a valid session exists in chrome.storage.session, it's returned.
 * Otherwise, it prompts the user to sign a new nonce.
 * @param account The connected account interface.
 * @returns The authentication state, including the signature.
 */
export async function ensureSession(
  account: AccountInterface
): Promise<AuthState> {
  const sessionKey = `contextvault_session_${account.address}`;
  const cachedSession: AuthState | undefined = (
    await chrome.storage.session.get(sessionKey)
  )[sessionKey];

  // If a valid session exists for this browser instance, reuse it.
  if (cachedSession) {
    return cachedSession;
  }

  // 1. Generate a secure, random nonce for the user to sign.
  // Use a more descriptive message and UUID for uniqueness
  const nonce = `Sign this message to authenticate your session with ContextVault. This does not cost gas.\nNonce ID: ${crypto.randomUUID()}`;

  // 2. Prompt the user to sign the nonce with their wallet.
  const signer: SignerInterface = (account as any).signer;
  if (!signer || typeof signer.signMessage !== "function") {
    throw new Error(
      "The connected wallet does not support message signing or signer is not available."
    );
  }

  // Create TypedData structure for StarkNet message signing
  const typedData = {
    types: {
      StarkNetDomain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
      ],
      Message: [{ name: "content", type: "string" }],
    },
    primaryType: "Message",
    domain: {
      name: "ContextVault",
      version: "1",
    },
    message: {
      content: nonce,
    },
  };

  const signatureResult = await signer.signMessage(typedData, account.address);

  // Convert to string format for storage
  const signature = JSON.stringify(signatureResult);

  // 3. Store the authenticated session.
  const authState: AuthState = { address: account.address, signature };
  await chrome.storage.session.set({ [sessionKey]: authState });

  return authState;
}

/**
 * A high-level function that connects and authenticates.
 * This should be called before any action that requires user ownership.
 * @returns The authenticated state.
 * @throws If the user fails to connect or sign.
 */
export async function requireAuth(): Promise<AuthState> {
  const account = await connectWallet();
  return ensureSession(account);
}
