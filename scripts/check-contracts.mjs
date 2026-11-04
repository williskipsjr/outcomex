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

const MARKET_ID_REGEX = /^pm-\d+$/;
const PRACTICE_ID_REGEX = /^pr-\d+$/;

let hasFailure = false;

async function checkJson(filename, validator) {
  const filePath = join(DATA_DIR, filename);
  try {
    const raw = await readFile(filePath, "utf8");
    const json = JSON.parse(raw);
    validator(json);
    console.log(`✅ [contract pass] client/public/data/${filename}`);
    return json;
  } catch (err) {
    console.error(`❌ [contract fail] client/public/data/${filename}:`, err.message);
    hasFailure = true;
    process.exitCode = 1;
    return null;
  }
}

async function main() {
  console.log("Running OutcomeX Data Contract Checks (BE-12)...\n");

  // 1. Check predictions.json
  await checkJson("predictions.json", (data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Root must be an object");
    }

    // Level must be "model" or "signal", because the app rejects "none" in the file
    if (data.level !== "model" && data.level !== "signal") {
      throw new Error(`Invalid level: "${data.level}" (must be "model" or "signal")`);
    }

    if (typeof data.modelVersion !== "string" && data.modelVersion !== null) {
      throw new Error("modelVersion must be a string or null");
    }

    // metrics is required, with testBrier, crowdBrier and n
    if (!data.metrics || typeof data.metrics !== "object" || Array.isArray(data.metrics)) {
      throw new Error("metrics object is required");
    }
    if (typeof data.metrics.testBrier !== "number" || Number.isNaN(data.metrics.testBrier)) {
      throw new Error("metrics.testBrier must be a number");
    }
    if (typeof data.metrics.crowdBrier !== "number" || Number.isNaN(data.metrics.crowdBrier)) {
      throw new Error("metrics.crowdBrier must be a number");
    }
    if (typeof data.metrics.n !== "number" || !Number.isInteger(data.metrics.n) || data.metrics.n < 0) {
      throw new Error("metrics.n must be a non-negative integer");
    }

    if (!data.predictions || typeof data.predictions !== "object" || Array.isArray(data.predictions)) {
      throw new Error("predictions dictionary is missing");
    }

    const count = Object.keys(data.predictions).length;
    if (count === 0) throw new Error("predictions dictionary is empty");

    for (const [id, pred] of Object.entries(data.predictions)) {
      // IDs must match pm-<digits>
      if (!MARKET_ID_REGEX.test(id)) {
        throw new Error(`Invalid market ID: "${id}" (must match pm-<digits>)`);
      }

      if (data.level === "model" && pred.probability !== null) {
        if (
          typeof pred.probability !== "number" ||
          Number.isNaN(pred.probability) ||
          pred.probability < 0 ||
          pred.probability > 1
        ) {
          throw new Error(`Invalid probability for ${id}: ${pred.probability}`);
        }
      }

      if (!Array.isArray(pred.explanation)) {
        throw new Error(`explanation for ${id} must be an array`);
      }

      // explanation has at most 3 lines
      if (pred.explanation.length > 3) {
        throw new Error(`explanation for ${id} has ${pred.explanation.length} lines (maximum allowed is 3)`);
      }

      for (let i = 0; i < pred.explanation.length; i++) {
        if (typeof pred.explanation[i] !== "string") {
          throw new Error(`explanation line for ${id} must be a string`);
        }
      }
    }
    console.log(
      `   (Checked ${count} market predictions, level: ${data.level}, metrics: testBrier=${data.metrics.testBrier}, crowdBrier=${data.metrics.crowdBrier}, n=${data.metrics.n})`
    );
  });

  // 2. Check practice-list.json
  const practiceList = await checkJson("practice-list.json", (data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Root must be an object");
    }
    if (!Array.isArray(data.items)) throw new Error("items must be an array");
    if (data.items.length === 0) throw new Error("items array is empty");

    for (const item of data.items) {
      // IDs must match pr-<digits>
      if (!item.id || !PRACTICE_ID_REGEX.test(item.id)) {
        throw new Error(`Invalid practice ID: "${item.id}" (must match pr-<digits>)`);
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
  const practiceAnswers = await checkJson("practice-answers.json", (data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Root must be an object");
    }
    if (!data.answers || typeof data.answers !== "object" || Array.isArray(data.answers)) {
      throw new Error("answers dictionary is missing");
    }

    const count = Object.keys(data.answers).length;
    if (count === 0) throw new Error("answers dictionary is empty");

    for (const [id, ans] of Object.entries(data.answers)) {
      // IDs must match pr-<digits>
      if (!PRACTICE_ID_REGEX.test(id)) {
        throw new Error(`Invalid practice ID in answers: "${id}" (must match pr-<digits>)`);
      }
      if (!["YES", "NO"].includes(ans.outcome)) {
        throw new Error(`Invalid outcome for ${id}: ${ans.outcome}`);
      }
      // crowdProbabilityAsOf must be a number, not null, because the reveal rejects null
      if (
        typeof ans.crowdProbabilityAsOf !== "number" ||
        Number.isNaN(ans.crowdProbabilityAsOf) ||
        ans.crowdProbabilityAsOf < 0 ||
        ans.crowdProbabilityAsOf > 1
      ) {
        throw new Error(
          `Invalid crowdProbabilityAsOf for ${id}: expected number between 0 and 1, got ${ans.crowdProbabilityAsOf}`
        );
      }
      if (
        ans.aiProbability !== null &&
        ans.aiProbability !== undefined &&
        (typeof ans.aiProbability !== "number" ||
          Number.isNaN(ans.aiProbability) ||
          ans.aiProbability < 0 ||
          ans.aiProbability > 1)
      ) {
        throw new Error(`Invalid aiProbability for ${id}: ${ans.aiProbability}`);
      }
    }
    console.log(`   (Checked ${count} practice answers)`);
  });

  // 4. Practice IDs symmetry: every question in the list must have an answer, and every answer a question
  if (practiceList && practiceAnswers) {
    const listIds = new Set(practiceList.items.map((item) => item.id));
    const answerIds = new Set(Object.keys(practiceAnswers.answers));

    const missingAnswers = [...listIds].filter((id) => !answerIds.has(id));
    const missingQuestions = [...answerIds].filter((id) => !listIds.has(id));

    if (missingAnswers.length > 0 || missingQuestions.length > 0) {
      hasFailure = true;
      process.exitCode = 1;
      if (missingAnswers.length > 0) {
        console.error(
          `❌ [contract fail] Practice ID mismatch: ${missingAnswers.length} question(s) in practice-list.json missing corresponding answers in practice-answers.json:`,
          missingAnswers.slice(0, 5).join(", ") + (missingAnswers.length > 5 ? "..." : "")
        );
      }
      if (missingQuestions.length > 0) {
        console.error(
          `❌ [contract fail] Practice ID mismatch: ${missingQuestions.length} answer(s) in practice-answers.json missing corresponding questions in practice-list.json:`,
          missingQuestions.slice(0, 5).join(", ") + (missingQuestions.length > 5 ? "..." : "")
        );
      }
    } else {
      console.log(`✅ [contract pass] 1:1 symmetry: all ${listIds.size} practice questions have corresponding answers`);
    }
  }

  // Final summary: only show success if no checks failed
  if (hasFailure || process.exitCode) {
    console.error("\n❌ Data contract checks failed.");
  } else {
    console.log("\nAll data contracts verified successfully.");
  }
}

main();
