// extension/entrypoints/background.ts
import { provider, contextRegistry, account } from "../lib/starknet";
import { downloadFromIPFS } from "../lib/ipfsStorage";
import { decryptContext } from "../lib/encryption";
import { b642ab } from "../lib/base64";

export default defineBackground(() => {
  console.log("ContextVault background script loaded");

  // Initialize background listeners
  chrome.runtime.onInstalled.addListener(() => {
    console.log("ContextVault background script installed");
    syncContextFromChain();
  });

  chrome.runtime.onStartup.addListener(() => {
    console.log("ContextVault background script started");
    syncContextFromChain();
  });

  // Handle messages from content scripts and popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "get-context") {
      handleGetContext(sendResponse);
      return true; // Keep channel open for async response
    }

    if (message.type === "sync-context") {
      syncContextFromChain();
      sendResponse({ success: true });
      return true;
    }
  });

  // Get cached context for content scripts
  async function handleGetContext(sendResponse: (response: any) => void) {
    try {
      const result = await getStorageData(["decrypted_context"]);
      sendResponse(result.decrypted_context || null);
    } catch (error) {
      console.error("Failed to get context:", error);
      sendResponse(null);
    }
  }

  // Main sync function - downloads latest context from blockchain
  async function syncContextFromChain() {
    try {
      console.log("Starting context sync...");

      // Get current local data
      const stored = await getStorageData([
        "current_cid",
        "context_key_b64",
        "hash_cid_map",
      ]);

      if (!stored.context_key_b64) {
        console.log("No encryption key found - user hasn't saved context yet");
        return;
      }

      // Get latest hash from blockchain
      const onChainHash = await getChainContextHash();
      console.log("On-chain hash:", onChainHash);

      // Calculate hash of current CID
      const currentCidHash = stored.current_cid
        ? await calculateSHA256Hash(stored.current_cid)
        : null;

      // Check if we need to update
      if (!stored.current_cid || currentCidHash !== onChainHash) {
        console.log("Context out of sync - downloading latest...");
        await downloadAndDecryptContext(onChainHash, stored);
      } else {
        console.log("Context is up to date");
      }

      // Notify all tabs about context update
      await notifyAllTabs();
    } catch (error) {
      console.error("Context sync failed:", error);
    }
  }

  // Get context hash from blockchain
  async function getChainContextHash(): Promise<string> {
    const result = await contextRegistry.get_context_hash(account.address);
    const hashBigInt = BigInt(result);
    return hashBigInt.toString(16).padStart(64, "0");
  }

  // Download and decrypt new context
  async function downloadAndDecryptContext(hashHex: string, stored: any) {
    // Find CID for this hash
    const cid = findCIDForHash(hashHex, stored.hash_cid_map);
    if (!cid) {
      console.warn(`No CID found for hash ${hashHex}`);
      return;
    }

    console.log("Downloading CID:", cid);

    // Download encrypted data
    const encryptedData = await downloadFromIPFS(cid);

    // Import decryption key
    const keyBuffer = b642ab(stored.context_key_b64);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // Decrypt context
    const decryptedContext = await decryptContext(encryptedData, cryptoKey);

    // Save to local storage
    await setStorageData({
      current_cid: cid,
      decrypted_context: decryptedContext,
    });

    console.log("Context updated successfully");
  }

  // Find CID for a given hash
  function findCIDForHash(
    hashHex: string,
    hashCidMap: Record<string, string> = {}
  ): string | null {
    return hashCidMap[hashHex] || null;
  }

  // Calculate SHA256 hash of a string
  async function calculateSHA256Hash(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Notify all tabs about context update
  async function notifyAllTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      const promises = tabs.map((tab) => {
        if (tab.id) {
          return chrome.tabs
            .sendMessage(tab.id, { type: "context-updated" })
            .catch(() => {}); // Ignore errors for tabs that can't receive messages
        }
      });
      await Promise.all(promises);
    } catch (error) {
      console.error("Failed to notify tabs:", error);
    }
  }

  // Wrapper for chrome.storage.local.get with Promise
  function getStorageData(keys: string[]): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  // Wrapper for chrome.storage.local.set with Promise
  function setStorageData(data: Record<string, any>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }
});
