// extension/lib/starknet.ts
import { RpcProvider, Account, Contract, json } from "starknet";
import ContextRegistryFile from "../abi/ContextRegistry.json";

// ===  Devnet settings (swap URL & keys later for Sepolia)  =========
const RPC_URL = "http://127.0.0.1:5050/rpc";
export const CONTRACT_ADDR =
  "0x03a2013db94061a9fa9df9686ffaace1f0fd9630272960ded9007768e98dfd1c";
const ACCOUNT_ADDR =
  "0x64b48806902a367c8598f4f95c305e8c1a1acba5f082d294a43793113115691";
const PRIVATE_KEY = "0x71d7bb07b9a64f6f78ac4c816aff4da9";  // <- paste address from `starkli deploy`

// -------------------------------------------------------------------
export const provider = new RpcProvider({ nodeUrl: RPC_URL });
export const account = new Account(provider, ACCOUNT_ADDR, PRIVATE_KEY);

const abi = ContextRegistryFile.abi;
if (!abi) {
  console.error("ABI missing in ContextRegistry.json");
  throw new Error("ABI missing");
}

export const contextRegistry = new Contract(abi, CONTRACT_ADDR, provider);
contextRegistry.connect(account); // attach signer so we can write
