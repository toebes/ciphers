#!/usr/bin/env node
/**
 * find-words-in-quotes.js
 * 
 * Usage:
 *   node find-words-in-quotes.js --words "words_all.txt" --quotes "quotes.txt" --out "word_hits.csv" --nohits "nohits.csv"
 *
 * - words.txt: one word per line
 * - quotes.txt: one quote per line (plain text)
 * - outputs two CSVs:
 *      word_hits.csv   => Word,QuoteNum,Quote
 *      word_nohits.csv => Word
 */

const fs = require("fs");
const path = require("path");

// ---------- CLI ----------
function arg(name, fallback = null) {
    const flag = `--${name}`;
    const i = process.argv.indexOf(flag);
    if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
    return fallback;
}

const wordsPath = arg("words");
const quotesPath = arg("quotes");
const outPath = arg("out") || (quotesPath ? path.join(path.dirname(quotesPath), "word_hits.csv") : null);
const noHitsPath = arg("nohits") || (quotesPath ? path.join(path.dirname(quotesPath), "word_nohits.csv") : null);

if (!wordsPath || !quotesPath) {
    console.error("Usage: node find-words-in-quotes.js --words <words.txt> --quotes <quotes.txt> [--out word_hits.csv] [--nohits word_nohits.csv]");
    process.exit(1);
}
if (!fs.existsSync(wordsPath)) { console.error(`Words file not found: ${wordsPath}`); process.exit(1); }
if (!fs.existsSync(quotesPath)) { console.error(`Quotes file not found: ${quotesPath}`); process.exit(1); }

// ---------- Load inputs ----------
const wordList = Array.from(new Set(
    fs.readFileSync(wordsPath, "utf8")
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean)
));

const quotes = fs.readFileSync(quotesPath, "utf8")
    .split(/\r?\n/)
    .map(q => q.trim())
    .filter(Boolean);

// ---------- Helper ----------
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildWordPattern(word) {
    // Whole-word Unicode-aware
    const w = escapeRegex(word);
    return new RegExp(`(?<!\\p{L})${w}(?!\\p{L})`, "iu");
}

// ---------- Search ----------
const results = [];
const noHits = [];

for (const w of wordList) {
    const pat = buildWordPattern(w);
    let found = false;
    quotes.forEach((q, idx) => {
        if (pat.test(q)) {
            results.push({
                Word: w,
                QuoteNum: idx + 1,
                Quote: q
            });
            found = true;
        }
    });
    if (!found) noHits.push({ Word: w });
}

// ---------- Write CSV ----------
function toCSV(rows) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const esc = (s) => {
        const str = String(s ?? "");
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const lines = [];
    lines.push(headers.map(esc).join(","));
    for (const row of rows) lines.push(headers.map(h => esc(row[h])).join(","));
    return lines.join("\n") + "\n";
}

if (outPath) {
    fs.writeFileSync(outPath, toCSV(results), "utf8");
    console.log(`✅ Matches: ${results.length} -> ${outPath}`);
}
if (noHitsPath) {
    fs.writeFileSync(noHitsPath, toCSV(noHits), "utf8");
    console.log(`ℹ️ No-hits: ${noHits.length} -> ${noHitsPath}`);
}

console.log(`Searched ${wordList.length} words across ${quotes.length} quotes.`);
