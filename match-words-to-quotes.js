#!/usr/bin/env node
// match-words-to-quotes.js  (robust UTF-8/UTF-16 reader)

const fs = require("fs");
const path = require("path");

// --- CLI ---
function arg(name, fallback = null) {
    const flag = `--${name}`;
    const i = process.argv.indexOf(flag);
    return (i !== -1 && i + 1 < process.argv.length) ? process.argv[i + 1] : fallback;
}

const quotesPath = arg("quotes");
const wordsPath = arg("words");
const outPath = arg("out") || (quotesPath ? path.join(path.dirname(quotesPath), "quote_matches.csv") : null);

if (!quotesPath || !wordsPath) {
    console.error("Usage: node match-words-to-quotes.js --quotes <quotes.txt> --words <words.txt> [--out quote_matches.csv]");
    process.exit(1);
}
if (!fs.existsSync(quotesPath)) { console.error(`Quotes file not found: ${quotesPath}`); process.exit(1); }
if (!fs.existsSync(wordsPath)) { console.error(`Words file not found:  ${wordsPath}`); process.exit(1); }

// --- Smart text reader (UTF-8 / UTF-16LE / UTF-16BE) ---
function readTextSmart(filePath) {
    const buf = fs.readFileSync(filePath);

    // UTF-8 BOM
    if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
        return buf.slice(3).toString("utf8");
    }
    // UTF-16 LE BOM
    if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
        return buf.slice(2).toString("utf16le");
    }
    // UTF-16 BE BOM
    if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
        // swap bytes to LE then decode
        const swapped = Buffer.allocUnsafe(buf.length - 2);
        for (let i = 2; i < buf.length; i += 2) {
            swapped[i - 2] = buf[i + 1];
            swapped[i - 1] = buf[i];
        }
        return swapped.toString("utf16le");
    }
    // Heuristic: lots of NULs => probably UTF-16LE without BOM
    let nulCount = 0;
    for (let i = 0; i < Math.min(buf.length, 4096); i++) if (buf[i] === 0) nulCount++;
    if (nulCount > 0.1 * Math.min(buf.length, 4096)) {
        return buf.toString("utf16le");
    }
    // Fallback: UTF-8
    return buf.toString("utf8");
}

// --- Normalization & Tokenizer ---
function normalizeText(s) {
    if (!s) return "";
    // Remove BOM char if present, and stray NULs just in case
    let t = s.replace(/\uFEFF/g, "").replace(/\u0000/g, "");
    // Curly apostrophes -> straight
    t = t.replace(/[\u2018\u2019]/g, "'");
    // Strip accents
    t = t.normalize("NFKD").replace(/\p{M}/gu, "");
    // Uppercase
    return t.toUpperCase();
}

// Original splitting regex (expects uppercased input)
function extractWords(upperText) {
    return upperText.match(/[A-Z]+(?:'[A-Z]+)*/g) || [];
}

// --- Load files (using smart reader) ---
const wordsRaw = readTextSmart(wordsPath);
const quotesRaw = readTextSmart(quotesPath);

const wordList = Array.from(new Set(
    wordsRaw.split(/\r?\n/).map(s => normalizeText(s.trim())).filter(Boolean)
));
const quotes = quotesRaw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

const wordSet = new Set(wordList);

// --- Process quotes ---
const results = [];
let matchCount = 0;

// (process all; change to a small number if you only want to debug first N)
for (let i = 0; i < quotes.length; i++) {
    const rawQuote = quotes[i];
    const words = extractWords(normalizeText(rawQuote));
    const matched = [...new Set(words.filter(w => wordSet.has(w)))];
    if (matched.length > 0) {
        matchCount++;
        results.push({ QuoteNum: i + 1, Quote: rawQuote, MatchedWords: matched.join(" ") });
    }
}

// --- CSV writer ---
function toCSV(rows) {
    if (!rows.length) return "QuoteNum,Quote,MatchedWords\n";
    const headers = Object.keys(rows[0]);
    const esc = s => {
        const str = String(s ?? "");
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const lines = [headers.map(esc).join(",")];
    for (const r of rows) lines.push(headers.map(h => esc(r[h])).join(","));
    return lines.join("\n") + "\n";
}

// --- Write output ---
if (outPath) {
    fs.writeFileSync(outPath, toCSV(results), "utf8");
    console.log(`✅ ${matchCount} quotes matched out of ${quotes.length}`);
    console.log(`CSV written to ${outPath}`);
} else {
    console.log(`Matched ${matchCount} quotes (no output file specified).`);
}
