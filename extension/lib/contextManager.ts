// extension/lib/contextManager.ts
import { userContext } from "./types/userContext";
import { uploadToIPFS, downloadFromIPFS } from "./ipfsStorage";
import { encryptContext, decryptContext, generateKey } from "./encryption";
import { setHash, getHash } from "./contextBridge";
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

// Convert SHA-256 hash to felt252-compatible decimal string
function sha256ToFelt252(cid: string): string {
  // Get SHA-256 hash bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(cid);

  // This needs to be synchronous for proper conversion
  // We'll use a simpler approach that doesn't require async
  let hash = 0;
  for (let i = 0; i < cid.length; i++) {
    const char = cid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Ensure it's positive and within felt252 range
  const positiveHash = Math.abs(hash);
  const felt252Max = Math.pow(2, 252) - 1;
  const feltValue = positiveHash % felt252Max;

  return feltValue.toString(); // Return as decimal string
}

// Better approach: Use CID directly as felt252 (truncated)
function cidToFelt252(cid: string): string {
  // Take first 60 characters of CID and convert to a safe felt252
  const truncatedCid = cid.substring(0, 60);
  let hash = 0;

  for (let i = 0; i < truncatedCid.length; i++) {
    const char = truncatedCid.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  // Ensure positive and within felt252 range (2^252 - 1)
  const felt252Value = Math.abs(hash) % Number.MAX_SAFE_INTEGER;
  return felt252Value.toString();
}

export async function saveUserContext(context: UserContext): Promise<string> {
  try {
    console.log("Starting context save...");

    // 1. Generate or retrieve user's encryption key
    const key = await generateKey();
    console.log("Generated encryption key");

    // 2. Encrypt context
    const encryptedData = await encryptContext(context, key);
    console.log("Context encrypted");

    // 3. Upload to IPFS
    const cid = await uploadToIPFS(encryptedData);
    console.log("Uploaded to IPFS with CID:", cid);

    // 4. Convert CID to felt252 (NOT SHA-256 hash)
    const feltHash = cidToFelt252(cid);
    console.log("Converted CID to felt252:", feltHash);

    // 5. Store felt on blockchain
    await setHash(feltHash);
    console.log("Hash stored on blockchain");

    // 6. Store key and mapping locally
    const keyArrayBuffer = await crypto.subtle.exportKey("raw", key);
    const keyB64 = ab2b64(keyArrayBuffer);

    await chrome.storage.local.set({
      [`context_key_${cid}`]: keyB64,
      current_cid: cid,
      // Store the mapping for retrieval
      hash_cid_map: {
        ...((await chrome.storage.local.get(["hash_cid_map"])).hash_cid_map ||
          {}),
        [feltHash]: cid,
      },
    });

    console.log("Context saved successfully");
    return cid;
  } catch (error) {
    console.error("Save context failed:", error);
    throw error;
  }
}

export async function loadUserContext(): Promise<UserContext | null> {
  try {
    console.log("Loading user context...");

    // 1. Get current CID from storage
    const { current_cid } = await chrome.storage.local.get(["current_cid"]);
    if (!current_cid) {
      console.log("No current CID found");
      return null;
    }

    // 2. Get encryption key
    const { [`context_key_${current_cid}`]: keyB64 } =
      await chrome.storage.local.get([`context_key_${current_cid}`]);
    if (!keyB64) {
      console.log("No encryption key found for CID:", current_cid);
      return null;
    }

    const keyArrayBuffer = b642ab(keyB64);
    const key = await crypto.subtle.importKey(
      "raw",
      keyArrayBuffer,
      "AES-GCM",
      false,
      ["decrypt"]
    );

    // 3. Download from IPFS
    const encryptedData = await downloadFromIPFS(current_cid);

    // 4. Decrypt and return
    const context = (await decryptContext(encryptedData, key)) as UserContext;
    console.log("Context loaded successfully");
    return context;
  } catch (error) {
    console.error("Failed to load context:", error);
    return null;
  }
}
