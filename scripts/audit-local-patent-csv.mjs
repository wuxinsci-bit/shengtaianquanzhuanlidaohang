import { readFile } from "node:fs/promises";
import { classifyPatent } from "../app/lib/domain-classifier.mjs";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const csvPath = process.argv[2] || "artifacts/google-patents-sample.csv";
const rows = parseCsv(await readFile(csvPath, "utf8"));
const headerIndex = rows.findIndex((row) => String(row[0] ?? "").replace(/^\uFEFF/, "").trim().toLowerCase() === "id");
const headers = rows[headerIndex].map((item) => String(item).trim().toLowerCase());
const counts = {};
const examples = {};
const confidenceCounts = {};
let rejected = 0;
let accepted = 0;
const families = new Set();

for (const row of rows.slice(headerIndex + 1)) {
  const item = Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").replace(/<[^>]+>/g, "").trim()]));
  if (!item.id || !item.title || !item.assignee) { rejected += 1; continue; }
  const familyKey = `${item.title.replace(/\s+/g, "")}|${item.assignee.replace(/\s+/g, "")}`;
  if (families.has(familyKey)) continue;
  families.add(familyKey);
  const classification = classifyPatent(item.title);
  if (!classification.domain) { rejected += 1; continue; }
  accepted += 1;
  counts[classification.domain] = (counts[classification.domain] || 0) + 1;
  confidenceCounts[classification.domain] ??= { high: 0, medium: 0, review: 0 };
  if (classification.confidence >= 0.85) confidenceCounts[classification.domain].high += 1;
  else if (classification.confidence >= 0.7) confidenceCounts[classification.domain].medium += 1;
  else confidenceCounts[classification.domain].review += 1;
  examples[classification.domain] ??= [];
  if (examples[classification.domain].length < 3) examples[classification.domain].push(item.title);
}

process.stdout.write(`${JSON.stringify({ totalRows: rows.length - headerIndex - 1, uniqueFamilies: families.size, accepted, rejected, counts, confidenceCounts, examples }, null, 2)}\n`);
