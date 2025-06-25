// lib/hashToFelt.ts
export async function sha256ToFeltDecimal(cid: string): Promise<string> {
  // 1. full 256-bit digest
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(cid)
  );

  // 2. convert to bigint
  const big = BigInt(
    "0x" +
      Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
  );

  // 3. keep only the lower 252 bits (Starknet field element constraint)
  const felt = big & ((1n << 252n) - 1n);

  // 4. return decimal string for starknet.js
  return felt.toString();
}
