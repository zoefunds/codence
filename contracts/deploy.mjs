import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const privateKey = process.env.BRIDGE_PRIVATE_KEY;
if (!privateKey) {
  console.error("BRIDGE_PRIVATE_KEY env var required");
  process.exit(1);
}

const account = createAccount(privateKey);
console.log(`Deploying from account: ${account.address}`);

const client = createClient({
  chain: studionet,
  account,
});

const contractCode = readFileSync(resolve(__dirname, "src/codence_review.py"), "utf-8");

console.log("Deploying contract...");
const txHash = await client.deployContract({
  code: contractCode,
  args: [],
});

console.log(`Deploy tx: ${txHash}`);
console.log("Waiting for finalization...");

const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: 5, // FINALIZED
  interval: 10000,
  retries: 60,
});

const contractAddress = receipt.result?.contract_address || receipt.contractAddress;
console.log(`\nContract deployed at: ${contractAddress}`);
console.log(`\nUpdate CONTRACT_ADDRESS in chain-bridge and Fly.io:`);
console.log(`  fly secrets set CONTRACT_ADDRESS=${contractAddress} -a codence-bridge`);
