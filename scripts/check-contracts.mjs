// Issue BE-12: Validates the static ML data files against docs/contracts/data.md
//
// Usage: node scripts/check-contracts.mjs

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "client", "public", "data");

const CATEGORIES = [
  "Politics",
  "Sports",
  "Crypto",
  "Economy",
  "Tech & Science",
  "World",
  "Culture",
  "Other",
];

async function checkJson(filename, validator) {
  const filePath = join(DATA_DIR, filename);
  try {
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw);
    validator(json);
    console.log(`✅ [contract pass] client/public/data/${filename}`);
  } catch (err) {
    console.error(`❌ [contract fail] client/public/data/${filename}:`, err.message);
    process.exitCode = 1;
  }
}

async function main() {
  console.log("Running OutcomeX Data Contract Checks (BE-12)...\n");

  // 1. Check predictions.json
  await checkJson("predictions.json", (data) => {
    if (!data || typeof data !== "object") throw new Error("Root must be an object");
    if (!["model", "signal", "none"].includes(data.level)) {
      throw new Error(`Invalid level: ${data.level}`);
    }
    if (typeof data.modelVersion !== "string" && data.modelVersion !== null) {
      throw new Error("modelVersion must be a string or null");
    }
    if (!data.predictions || typeof data.predictions !== "object") {
      throw new Error("predictions dictionary is missing");
    }

    const count = Object.keys(data.predictions).length;
    if (count === 0) throw new Error("predictions dictionary is empty");

    for (const [id, pred] of Object.entries(data.predictions)) {
      if (!id.startsWith("pm-")) throw new Error(`Invalid market ID format in prediction: ${id}`);
      if (data.level === "model" && pred.probability !== null) {
        if (typeof pred.probability !== "number" || pred.probability < 0 || pred.probability > 1) {
          throw new Error(`Invalid probability for ${id}: ${pred.probability}`);
        }
      }
      if (!Array.isArray(pred.explanation)) {
        throw new Error(`explanation for ${id} must be an array`);
      }
    }
    console.log(`   (Checked ${count} market predictions, level: ${data.level})`);
  });

  // 2. Check practice-list.json
  await checkJson("practice-list.json", (data) => {
    if (!Array.isArray(data.items)) throw new Error("items must be an array");
    if (data.items.length === 0) throw new Error("items array is empty");

    for (const item of data.items) {
      if (!item.id || !item.id.startsWith("pr-")) {
        throw new Error(`Invalid practice ID format: ${item.id}`);
      }
      if (!item.question || typeof item.question !== "string") {
        throw new Error(`Missing question for item: ${item.id}`);
      }
      if (!CATEGORIES.includes(item.category)) {
        throw new Error(`Invalid category for ${item.id}: ${item.category}`);
      }
      if (!item.asOfDate || !item.closedDate) {
        throw new Error(`Missing dates for item: ${item.id}`);
      }
      // LEAK CHECK: outcomes or crowd prices must NEVER appear in practice-list.json
      if (item.outcome !== undefined) {
        throw new Error(`LEAK: item ${item.id} contains outcome!`);
      }
      if (item.crowdProbability !== undefined || item.crowdProbabilityAsOf !== undefined) {
        throw new Error(`LEAK: item ${item.id} contains crowd price!`);
      }
    }
    console.log(`   (Checked ${data.items.length} practice questions; 0 outcome leaks found)`);
  });

  // 3. Check practice-answers.json
  await checkJson("practice-answers.json", (data) => {
    if (!data.answers || typeof data.answers !== "object") {
      throw new Error("answers dictionary is missing");
    }

    const count = Object.keys(data.answers).length;
    if (count === 0) throw new Error("answers dictionary is empty");

    for (const [id, ans] of Object.entries(data.answers)) {
      if (!id.startsWith("pr-")) throw new Error(`Invalid practice ID in answers: ${id}`);
      if (!["YES", "NO"].includes(ans.outcome)) {
        throw new Error(`Invalid outcome for ${id}: ${ans.outcome}`);
      }
      if (ans.crowdProbabilityAsOf !== null && (typeof ans.crowdProbabilityAsOf !== "number" || ans.crowdProbabilityAsOf < 0 || ans.crowdProbabilityAsOf > 1)) {
        throw new Error(`Invalid crowdProbabilityAsOf for ${id}: ${ans.crowdProbabilityAsOf}`);
      }
    }
    console.log(`   (Checked ${count} practice answers)`);
  });

  console.log("\nAll data contracts verified successfully.");
}

main();
