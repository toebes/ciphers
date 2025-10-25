#!/usr/bin/env node
/**
 * Count-WordFrequency.js
 * Reads a text file, extracts words (apostrophes kept), normalizes accents,
 * and writes a CSV of Word,Count sorted by frequency (desc).
 *
 * Usage:
 *   node Count-WordFrequency.js -i "C:\path\quotes.txt" -o "C:\path\word_frequency.csv"
 */

const fs = require("fs");
const path = require("path");

// ---- tiny arg parser ----
function getArg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}
const inputPath = getArg("-i") || getArg("--input");
const outputPath = getArg("-o") || getArg("--output") ||
  (inputPath ? path.join(path.dirname(inputPath), "word_frequency.csv") : null);

if (!inputPath) {
  console.error("ERROR: missing -i <inputFile>");
  console.error("Usage: node Count-WordFrequency.js -i <input.txt> [-o output.csv]");
  process.exit(1);
}
if (!fs.existsSync(inputPath)) {
  console.error(`ERROR: input not found: ${inputPath}`);
  process.exit(1);
}

// ---- read file ----
const raw = fs.readFileSync(inputPath, "utf8");

// ---- normalize punctuation & accents ----
// 1) curly apostrophes -> straight '
let text = raw.replace(/[\u2018\u2019]/g, "'");
// 2) NFKD + strip combining marks (diacritics)
text = text.normalize("NFKD").replace(/\p{M}/gu, "");
// 3) uppercase for stable counting
text = text.toUpperCase();

// ---- tokenize: letters with optional internal apostrophe groups ----
// Examples: A, I'M, O'REILLY, CHILDREN'S
const TOKEN = /[A-Z]+(?:'[A-Z]+)*/g;
const words = text.match(TOKEN) || [];

if (words.length === 0) {
  console.warn("No words matched.");
  fs.writeFileSync(outputPath, "Word,Count\n");
  console.log(`Wrote empty CSV to ${outputPath}`);
  process.exit(0);
}

// ---- frequency count ----
const map = new Map();
for (const w of words) map.set(w, (map.get(w) || 0) + 1);

// ---- sort by count desc ----
const rows = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

// ---- write CSV ----
const csv = ["Word,Count", ...rows.map(([w, c]) => `${w},${c}`)].join("\n");
fs.writeFileSync(outputPath, csv, "utf8");

// ---- console summary ----
const uniques = rows.length;
console.log(`✅ Saved ${uniques} unique words to ${outputPath} (from ${words.length} tokens).`);
console.log("Top 20:");
for (const [w, c] of rows.slice(0, 20)) {
  console.log(`${w},${c}`);
}
