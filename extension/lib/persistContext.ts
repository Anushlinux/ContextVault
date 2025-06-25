// extension/lib/persistContext.ts
import { Web3Storage } from "web3.storage";
import { setHash } from "./contextBridge";

const w3 = new Web3Storage({ token: import.meta.env.VITE_W3_TOKEN! });

export async function pushContext(obj: object, aesKey: CryptoKey) {
  /* 1. compress + encrypt (gzip skipped for brevity) */
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(obj));
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    data
  );

  /* 2. upload to IPFS */
  const cid = await w3.put([new File([buf], "ctx")]);

  /* 3. store SHA-256(cid) on-chain */
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(cid)
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  await setHash(hex);
  return cid;
}
