import express from "express";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const app = express();
app.use(express.json({ limit: "5mb" }));

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x996Cb5Cba2A81dB0582D9b4B9bb7f4b7E4d8DB3F";
const PORT = process.env.BRIDGE_PORT || 8001;

const account = createAccount(process.env.BRIDGE_PRIVATE_KEY || undefined);
console.log(`Service account address: ${account.address}`);

const client = createClient({
  chain: studionet,
  account: account,
});

function getClient(signerPrivateKey) {
  if (!signerPrivateKey) return client;
  const userAccount = createAccount(signerPrivateKey);
  return createClient({ chain: studionet, account: userAccount });
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", contract: CONTRACT_ADDRESS, account: account.address });
});

// ─── Write Methods ────────────────────────────────────────────────────────────

app.post("/submit-review", async (req, res) => {
  try {
    const {
      review_id, code_hash, title, source,
      org_id, submitter_address, language,
      file_count, total_lines, total_bytes,
      signer_private_key,
    } = req.body;

    const c = getClient(signer_private_key);
    const txHash = await c.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "submit_review",
      args: [
        review_id,
        code_hash,
        title,
        source || "paste",
        org_id || "",
        submitter_address || "",
        language || "unknown",
        file_count || 1,
        total_lines || 0,
        total_bytes || 0,
      ],
    });

    res.json({ tx_hash: txHash });
  } catch (err) {
    console.error("submit-review error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/analyze-review", async (req, res) => {
  try {
    const { review_id, code_content, language, signer_private_key } = req.body;

    const c = getClient(signer_private_key);
    const txHash = await c.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "analyze_and_review",
      args: [review_id, code_content, language || "unknown"],
    });

    res.json({ tx_hash: txHash });
  } catch (err) {
    console.error("analyze-review error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/flag-false-positive", async (req, res) => {
  try {
    const { finding_id, reason } = req.body;

    const txHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "flag_false_positive",
      args: [finding_id, reason || ""],
    });

    res.json({ tx_hash: txHash });
  } catch (err) {
    console.error("flag-false-positive error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/unflag-false-positive", async (req, res) => {
  try {
    const { finding_id } = req.body;

    const txHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "unflag_false_positive",
      args: [finding_id],
    });

    res.json({ tx_hash: txHash });
  } catch (err) {
    console.error("unflag-false-positive error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/appeal-review", async (req, res) => {
  try {
    const { review_id, reason, disputed_finding_ids } = req.body;

    const txHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "appeal_review",
      args: [review_id, reason || "", disputed_finding_ids || ""],
    });

    res.json({ tx_hash: txHash });
  } catch (err) {
    console.error("appeal-review error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/resolve-appeal", async (req, res) => {
  try {
    const { appeal_id, code_content, language } = req.body;

    const txHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "resolve_appeal",
      args: [appeal_id, code_content, language || "unknown"],
    });

    res.json({ tx_hash: txHash });
  } catch (err) {
    console.error("resolve-appeal error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/archive-review", async (req, res) => {
  try {
    const { review_id } = req.body;

    const txHash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName: "archive_review",
      args: [review_id],
    });

    res.json({ tx_hash: txHash });
  } catch (err) {
    console.error("archive-review error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Transaction Status ───────────────────────────────────────────────────────

app.post("/wait-for-tx", async (req, res) => {
  try {
    const { tx_hash, status } = req.body;

    const targetStatus = status === "ACCEPTED"
      ? TransactionStatus.ACCEPTED
      : TransactionStatus.FINALIZED;

    const receipt = await client.waitForTransactionReceipt({
      hash: tx_hash,
      status: targetStatus,
      interval: 10000,
      retries: 120,
    });

    res.json({ receipt });
  } catch (err) {
    console.error("wait-for-tx error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/get-tx", async (req, res) => {
  try {
    const { tx_hash } = req.body;

    const tx = await client.getTransaction({ hash: tx_hash });
    res.json({ transaction: tx });
  } catch (err) {
    console.error("get-tx error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Read Methods ─────────────────────────────────────────────────────────────

app.post("/read-review", async (req, res) => {
  try {
    const { review_id } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_review",
      args: [review_id],
    });
    res.json({ result });
  } catch (err) {
    console.error("read-review error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/read-findings", async (req, res) => {
  try {
    const { review_id } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_review_findings",
      args: [review_id],
    });
    res.json({ result });
  } catch (err) {
    console.error("read-findings error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/read-findings-by-severity", async (req, res) => {
  try {
    const { review_id, severity } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_findings_by_severity",
      args: [review_id, severity],
    });
    res.json({ result });
  } catch (err) {
    console.error("read-findings-by-severity error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/read-findings-by-category", async (req, res) => {
  try {
    const { review_id, category } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_findings_by_category",
      args: [review_id, category],
    });
    res.json({ result });
  } catch (err) {
    console.error("read-findings-by-category error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/read-confirmed-findings", async (req, res) => {
  try {
    const { review_id } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_confirmed_findings",
      args: [review_id],
    });
    res.json({ result });
  } catch (err) {
    console.error("read-confirmed-findings error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/read-review-summary", async (req, res) => {
  try {
    const { review_id } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_review_summary",
      args: [review_id],
    });
    res.json({ result });
  } catch (err) {
    console.error("read-review-summary error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/review-count", async (req, res) => {
  try {
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_review_count",
      args: [],
    });
    res.json({ count: Number(result) });
  } catch (err) {
    console.error("review-count error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/global-stats", async (req, res) => {
  try {
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_global_stats",
      args: [],
    });
    res.json({ result });
  } catch (err) {
    console.error("global-stats error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/user-reviews", async (req, res) => {
  try {
    const { user_address } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_user_reviews",
      args: [user_address],
    });
    res.json({ result });
  } catch (err) {
    console.error("user-reviews error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/org-reviews", async (req, res) => {
  try {
    const { org_id } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_org_reviews",
      args: [org_id],
    });
    res.json({ result });
  } catch (err) {
    console.error("org-reviews error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/reviews-paginated", async (req, res) => {
  try {
    const { page, page_size } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_reviews_paginated",
      args: [page || 1, page_size || 20],
    });
    res.json({ result });
  } catch (err) {
    console.error("reviews-paginated error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/contract-info", async (req, res) => {
  try {
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "get_contract_info",
      args: [],
    });
    res.json({ result });
  } catch (err) {
    console.error("contract-info error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/review-exists", async (req, res) => {
  try {
    const { review_id } = req.body;
    const result = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: "review_exists",
      args: [review_id],
    });
    res.json({ exists: result });
  } catch (err) {
    console.error("review-exists error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Chain bridge running on port ${PORT}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
});
