#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse, re, csv, hashlib
from pathlib import Path
from html import unescape

POS_LIST = ["Noun","Verb","Adjective","Adverb","Pronoun","Proper_noun","Interjection","Conjunction","Preposition","Determiner","Article","Numeral","Prefix","Suffix"]

def safe_filename(word: str) -> str:
    base = re.sub(r'[<>:"/\\|?*\x00-\x1F]', '_', word).strip('.')
    h = hashlib.sha1(word.encode()).hexdigest()[:8]
    return f"{base}_{h}.html"

def subdir_for_word(base_dir: Path, word: str) -> Path:
    key = (word[:2].lower() if len(word) >= 2 else (word[:1].lower() or "_"))
    return base_dir / key

def read_html(cache_root: Path, word: str) -> str | None:
    p = subdir_for_word(cache_root, word) / safe_filename(word)
    if not p.exists():
        return None
    try:
        return p.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None

def strip_tags(s: str) -> str:
    s = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', s, flags=re.S|re.I)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = unescape(s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def find_pos(html: str) -> list[str]:
    found = []
    for pos in POS_LIST:
        # id="Noun" or id='Noun'
        if f'id="{pos}"' in html or f"id='{pos}'" in html:
            found.append(pos.replace('_',' '))
    return found

def first_definition_after(html: str, anchor: str) -> str | None:
    # Look for the anchor then first <li> within a reasonable window
    idx = html.find(anchor)
    if idx == -1:
        return None
    window = html[idx: idx + 30000]  # scan next 30k chars
    m = re.search(r'<ol[^>]*>\s*<li[^>]*>(.*?)</li>', window, flags=re.S|re.I)
    if not m:
        # fallback: any <li>
        m = re.search(r'<li[^>]*>(.*?)</li>', window, flags=re.S|re.I)
    return strip_tags(m.group(1)) if m else None

def extract_first_def(html: str, pos_list: list[str]) -> str | None:
    # Try each POS in order
    for pos in pos_list:
        for anchor in (f'id="{pos.replace(" ","_")}"', f"id='{pos.replace(' ','_')}'"):
            d = first_definition_after(html, anchor)
            if d:
                return d
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="infile", required=True, help="word list, one per line")
    ap.add_argument("--wikt-cache-root", default="../cache/wiktionary_cache")
    ap.add_argument("--out", default="words_defs.csv")
    args = ap.parse_args()

    wikt_root = Path(args.wikt_cache_root)
    words = [w.strip() for w in Path(args.infile).read_text(encoding="utf-8").splitlines() if w.strip()]

    with open(args.out, "w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["word","is_english","pos","first_definition"])
        for w in words:
            html = read_html(wikt_root, w)
            if not html:
                wr.writerow([w, False, "", ""])
                continue
            pos = find_pos(html)
            is_en = bool(pos)
            first_def = extract_first_def(html, pos) if is_en else ""
            wr.writerow([w, is_en, ";".join(pos), first_def or ""])

if __name__ == "__main__":
    main()
