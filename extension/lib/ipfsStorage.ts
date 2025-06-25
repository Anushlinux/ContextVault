// extension/lib/ipfsStorage.ts
// -----------------------------------------------------------
// Pinata integration for a browser / extension context
// -----------------------------------------------------------

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;
const PINATA_GATEWAY =
  (import.meta.env.VITE_PINATA_GATEWAY as string | undefined) ??
  "https://gateway.pinata.cloud"; // default public gateway

if (!PINATA_JWT) {
  throw new Error(
    "Pinata JWT missing – add VITE_PINATA_JWT=... to your .env file"
  );
}

/**
 * Upload an encrypted ArrayBuffer to Pinata IPFS and return its CID.
 */
export async function uploadToIPFS(buf: ArrayBuffer): Promise<string> {
  // 1. Wrap the bytes in a File so Pinata gets a filename & MIME type
  const file = new File([buf], "context.enc", {
    type: "application/octet-stream",
  });

  // 2. Build multipart/form-data body
  const data = new FormData();
  data.append("file", file);

  // 3. POST to Pinata
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: data,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed (${res.status}): ${text}`);
  }

  // 4. Successful response → { IpfsHash, PinSize, Timestamp }
  const json = (await res.json()) as { IpfsHash: string };
  console.log("Pinata upload CID:", json.IpfsHash);
  return json.IpfsHash;
}

/**
 * Download previously-pinned content from Pinata.
 */
export async function downloadFromIPFS(cid: string): Promise<ArrayBuffer> {
  const url = `${PINATA_GATEWAY}/ipfs/${cid}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${cid} (${res.status})`);
  }
  return res.arrayBuffer();
}
