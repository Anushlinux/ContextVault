import { contextRegistry, provider, account } from "./starknet";

export async function getHash(user?: string) {
  const addr = user ?? account.address;
  const res = await contextRegistry.get_context_hash(addr);
  return BigInt(res).toString(); // Return as decimal string
}

export async function setHash(feltDecimal: string) {
  console.log("Setting hash on blockchain:", feltDecimal);

  // Pass the decimal string directly - don't convert to BigInt or hex
  const tx = await contextRegistry.set_context_hash(feltDecimal);
  await provider.waitForTransaction(tx.transaction_hash);
  return tx.transaction_hash;
}

export async function testConnection() {
  try {
    console.log("Testing provider connection...");
    const chainId = await provider.getChainId();
    console.log("Chain ID:", chainId);

    console.log("Testing contract connection...");
    const result = await contextRegistry.get_context_hash(account.address);
    console.log("Contract call result:", result);

    return { success: true, chainId, result };
  } catch (error) {
    console.error("Connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
