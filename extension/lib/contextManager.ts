// extension/lib/contextManager.ts
import { uploadToIPFS, downloadFromIPFS } from "./ipfsStorage";
import { encryptContext, decryptContext, generateKey } from "./encryption";
import { setHash, getHash } from "./contextBridge";
import { sha256ToFeltDecimal } from "./hashToFelt";
import { contextRegistry, provider } from "./starknet"; // Add this import
import { ab2b64, b642ab } from "./base64";

export interface UserContext {
  preferences: {
    codingStyle: string;
    language: string;
    frameworks: string[];
  };
  projectDetails: {
    name: string;
    description: string;
    techStack: string[];
  };
  conversationHistory: {
    platform: string;
    timestamp: number;
    context: string;
  }[];
}


export async function saveUserContext(context: UserContext): Promise<string> {
  // Steps 1-3 stay the same
  const key = await generateKey();
  const encryptedData = await encryptContext(context, key);
  const cid = await uploadToIPFS(encryptedData);

  // 4. Convert CID to felt252 and store on blockchain
  const feltHash = await sha256ToFeltDecimal(cid);
  const tx = await contextRegistry.set_context_hash(feltHash);
  await provider.waitForTransaction(tx.transaction_hash);

  const rawKey = await crypto.subtle.exportKey("raw", key); // ArrayBuffer
  // 5. Store encryption key locally
  await chrome.storage.local.set({
    [`context_key_${cid}`]: ab2b64(rawKey), // ✅ JSON-friendly
    current_cid: cid,
  });

  return cid;
}

export async function loadUserContext(): Promise<UserContext | null> {
  try {
    // 1. Get current CID from storage
    const { current_cid } = await chrome.storage.local.get(["current_cid"]);
    if (!current_cid) return null;

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(current_cid)
    );
    const hex256 = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const feltHash = sha256ToFeltDecimal(hex256); // ✅ fits felt252
    await setHash(await feltHash);

    // 2. Get encryption key
    const { [`context_key_${current_cid}`]: keyData } =
      await chrome.storage.local.get([`context_key_${current_cid}`]);
    if (!keyData) return null;

    const entry = await chrome.storage.local.get([
      `context_key_${current_cid}`,
    ]);
    const b64 = entry[`context_key_${current_cid}`];
    if (!b64) return null;

    const raw = b642ab(b64);
    const key = await crypto.subtle.importKey(
      "raw",
      raw,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // 3. Download from IPFS
    const encryptedData = await downloadFromIPFS(current_cid);

    // 4. Decrypt and return
    return (await decryptContext(encryptedData, key)) as UserContext;
  } catch (error) {
    console.error("Failed to load context:", error);
    return null;
  }
}
