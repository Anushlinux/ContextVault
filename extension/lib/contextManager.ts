// extension/lib/contextManager.ts
import { uploadToIPFS, downloadFromIPFS } from "./ipfsStorage";
import { encryptContext, decryptContext, generateKey } from "./encryption";
import { setHash, getHash } from "./contextBridge";
import { sha256ToFeltDecimal } from "./hashToFelt";

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
  // 1. Generate or retrieve user's encryption key
  const key = await generateKey();

  // 2. Encrypt context
  const encryptedData = await encryptContext(context, key);

  // 3. Upload to IPFS
  const cid = await uploadToIPFS(encryptedData);

  // 4. Store hash on blockchain
  const hashBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(cid)
  );
  const hashHex = Array.from(new Uint8Array(hashBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await setHash(hashHex);

  // 5. Store key locally (browser storage)
  await chrome.storage.local.set({
    [`context_key_${cid}`]: await crypto.subtle.exportKey("raw", key),
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

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      "AES-GCM",
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
