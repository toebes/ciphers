#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# word_checker.py (clean streaming with baseline summary)
# - Prints baseline cached summary immediately.
# - Does not read cached files up front.
# - Progress includes baseline cached count.
# - Drains futures with heartbeat.

import argparse, json, sys, time, random, tempfile, threading, socket, ssl
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from collections import deque
from pathlib import Path

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    HAVE_REQUESTS = True
except Exception:
    import urllib.request
    HAVE_REQUESTS = False

def warn(msg):
    sys.stderr.write(f"[warn] {msg}\n"); sys.stderr.flush()

DEFAULT_UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
              "AppleWebKit/537.36 (KHTML, like Gecko) "
              "Chrome/120.0.0.0 Safari/537.36")
DEFAULT_HEADERS = {
    "User-Agent": DEFAULT_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://en.wiktionary.org/",
    "Connection": "keep-alive",
    "DNT": "1",
    "Upgrade-Insecure-Requests": "1",
}

class TokenBucket:
    def __init__(self, rpm, capacity, min_sleep_ms=0):
        self.rate = max(0.0001, rpm / 60.0)
        self.capacity = max(1.0, float(capacity))
        self.tokens = self.capacity
        self.last = time.time()
        self.lock = threading.Lock()
        self.min_sleep = max(0.0, min_sleep_ms/1000.0)
    def acquire(self):
        while True:
            with self.lock:
                now = time.time()
                elapsed = now - self.last
                self.last = now
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                if self.tokens >= 1.0:
                    self.tokens -= 1.0
                    sleep_for = self.min_sleep
                    take = True
                else:
                    need = 1.0 - self.tokens
                    sleep_for = need / self.rate + self.min_sleep
                    take = False
            if sleep_for > 0:
                time.sleep(sleep_for)
            if take:
                return

def subdir_for_word(base_dir: Path, word: str) -> Path:
    key = (word[:2].lower() if len(word) >= 2 else (word[:1].lower() or "_"))
    subdir = base_dir / key
    subdir.mkdir(parents=True, exist_ok=True)
    return subdir

def safe_filename(word):
    import hashlib, re
    base = re.sub(r'[<>:"/\\|?*\x00-\x1F]', '_', word).strip('.')
    h = hashlib.sha1(word.encode()).hexdigest()[:8]
    return f"{base}_{h}.html"

def atomic_write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(dir=path.parent,prefix=path.name+".")
    with open(fd,"wb",closefd=False) as _f:
        pass
    with open(fd,"wb",closefd=False) as _f2:
        _f2.write(data)
    import os
    os.replace(tmp,path)

_http_counts={"ok":0,"403":0,"429":0,"503":0,"other":0,"cache":0,"errors":0}
_http_lock=threading.Lock()
_tls=threading.local()

def _bump(k):
    with _http_lock: _http_counts[k]=_http_counts.get(k,0)+1

def _get_session(pool_max, ua, headers):
    s=getattr(_tls,"session",None)
    if s: return s
    s=requests.Session()
    adapter=HTTPAdapter(pool_connections=pool_max,pool_maxsize=pool_max,max_retries=Retry(total=0))
    s.mount("https://",adapter); s.mount("http://",adapter)
    h = dict(headers); h["User-Agent"] = ua or DEFAULT_UA
    s.headers.update(h); _tls.session=s
    return s

def fetch_url(url,timeout,limiter,retries,backoff,pool_max,args):
    import time, random, ssl
    code, text = None, ""
    last_err = ""
    for attempt in range(retries + 1):
        if limiter:
            limiter.acquire()
        try:
            if args.backend == "requests" and HAVE_REQUESTS:
                r = _get_session(pool_max, args.ua, DEFAULT_HEADERS).get(
                    url, timeout=(5, timeout), verify=(not args.insecure), allow_redirects=True
                )
                code = r.status_code
                text = r.text if code == 200 else ""
            else:
                import urllib.request
                hdrs = dict(DEFAULT_HEADERS); hdrs["User-Agent"] = args.ua or DEFAULT_UA
                req = urllib.request.Request(url, headers=hdrs, method="GET")
                ctx = None
                if args.insecure:
                    ctx = ssl._create_unverified_context()
                try:
                    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
                        code = getattr(resp, "status", 200)
                        text = resp.read().decode("utf-8","replace") if code == 200 else ""
                except Exception as e:
                    code, text = 599, ""
            if code == 200:
                _bump("ok"); return code, text
            if code in (429, 503):
                _bump(str(code)); time.sleep(backoff * (2 ** attempt) + random.uniform(0,0.8)); continue
            if code in (400,401,403,404,410,451):
                _bump(str(code) if str(code) in ("403","429","503") else "other")
                return code, text
            _bump("other"); return code, text
        except Exception as e:
            time.sleep(backoff * (2 ** attempt) + random.uniform(0,0.8))
    return code if code is not None else 599, text


def parse_wiktionary_english(html):
    if not html: return False,[],{}
    pos=[]
    for part in ["Noun","Verb","Adjective","Adverb"]:
        if f'id="{part}"' in html or f"id='{part}'" in html:
            pos.append(part)
    return bool(pos),pos,{}

def parse_wikipedia_presence(html):
    return "mw-content-text" in (html or "")

def wikt_cache_path(wikt_dir: Path, word: str) -> Path:
    return subdir_for_word(wikt_dir, word) / safe_filename(word)

def wiki_cache_path(wiki_dir: Path, word: str) -> Path:
    return subdir_for_word(wiki_dir, word) / safe_filename(word)

def miss_marker_path(base_dir: Path, word: str, which: str) -> Path:
    # which: "wikt" or "wiki"
    p = subdir_for_word(base_dir, word) / (safe_filename(word) + f".{which}.miss")
    return p

def has_negative_cache(wikt_dir: Path, wiki_dir: Path, word: str, which: str) -> bool:
    if which == "wikt":
        return miss_marker_path(wikt_dir, word, which).exists()
    else:
        return miss_marker_path(wiki_dir, word, which).exists()

def write_negative_cache(wikt_dir: Path, wiki_dir: Path, word: str, which: str, reason: str):
    mp = miss_marker_path(wikt_dir if which=="wikt" else wiki_dir, word, which)
    mp.parent.mkdir(parents=True, exist_ok=True)
    try:
        mp.write_text(reason, encoding="utf-8")
    except Exception:
        pass

def word_fully_cached(wikt_dir: Path, wiki_dir: Path, word: str) -> bool:
    return wikt_cache_path(wikt_dir, word).exists() and wiki_cache_path(wiki_dir, word).exists()

def _worker(word, wikt_dir, wiki_dir, limiter, args):
    try:
        out = {"word": word, "is_english": False, "pos": [], "defs": {}, "wikipedia_present": False}

        # Initialize status codes to avoid unbound variable errors
        code = None
        code2 = None

        fn = wikt_cache_path(wikt_dir, word)
        html = ""
        if fn.exists():
            _bump("cache")
            html = fn.read_text("utf-8", "replace")
        else:
            # Negative cache check for Wiktionary
            if has_negative_cache(wikt_dir, wiki_dir, word, "wikt"):
                # previously known to not exist; skip network
                html = ""
            else:
                code, html = fetch_url(f"https://en.wiktionary.org/wiki/{word.lower()}",
                                       args.timeout, limiter, args.max_retries,
                                       args.backoff_base, args.pool_max, args)
                if code is not None and code != 200:
                    write_negative_cache(wikt_dir, wiki_dir, word, "wikt", f"http {code}")
                    html = ""
            if code == 200 and html:
                # atomic write
                p = wikt_cache_path(wikt_dir, word)
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(html, encoding="utf-8")

        ok, pos, defs = parse_wiktionary_english(html)
        out.update({"is_english": ok, "pos": pos, "defs": defs})

        wfn = wiki_cache_path(wiki_dir, word)
        html2 = ""
        if wfn.exists():
            _bump("cache")
            html2 = wfn.read_text("utf-8", "replace")
        else:
            # Negative cache check for Wikipedia
            if has_negative_cache(wikt_dir, wiki_dir, word, "wiki"):
                html2 = ""
            else:
                code2, html2 = fetch_url(f"https://en.wikipedia.org/wiki/{word.lower()}",
                                        args.timeout, limiter, args.max_retries,
                                        args.backoff_base, args.pool_max, args)
                if code is not None and code != 200:
                    write_negative_cache(wikt_dir, wiki_dir, word, "wiki", f"http {code}")
                    html2 = ""
            if code2 == 200 and html2:
                p2 = wiki_cache_path(wiki_dir, word)
                p2.parent.mkdir(parents=True, exist_ok=True)
                p2.write_text(html2, encoding="utf-8")

        # Detect 'no article' pages on Wikipedia and mark negative cache to avoid re-hitting
        try:
            if (not out["wikipedia_present"]) or ('id="noarticletext"' in (html2 or '')):
                write_negative_cache(wikt_dir, wiki_dir, word, "wiki", "noarticle")
        except Exception:
            pass

        out["wikipedia_present"] = parse_wikipedia_presence(html2)
        return out
    except Exception as e:
        _bump("errors"); warn(f"worker error for '{word}': {e}")
        return {"word": word, "error": str(e), "is_english": False, "pos": [], "defs": {}, "wikipedia_present": False}


def index_from_cache_pass(words, wikt_dir, wiki_dir, heartbeat_sec, scan_limit):
    """Scan existing cached HTML to mark 'no article' wiki pages as negative-cache.
    We cap to scan_limit files and print heartbeats; returns (scanned, marked)."""
    import time
    scanned = 0
    marked = 0
    last = time.time()
    for w in words:
        if scanned >= scan_limit:
            break
        # Only consider Wikipedia HTML that exists and no .wiki.miss yet
        p_html = wiki_cache_path(wiki_dir, w)
        if not p_html.exists():
            continue
        if has_negative_cache(wikt_dir, wiki_dir, w, "wiki"):
            continue
        try:
            html = p_html.read_text("utf-8", "replace")
        except Exception:
            continue
        scanned += 1
        no_article = ('id="noarticletext"' in html) or (not parse_wikipedia_presence(html))
        if no_article:
            write_negative_cache(wikt_dir, wiki_dir, w, "wiki", "noarticle")
            marked += 1
        now = time.time()
        if now - last >= heartbeat_sec:
            warn(f"index-from-cache: scanned={scanned} marked={marked}")
            last = now
    warn(f"index-from-cache: scanned={scanned} marked={marked} (limit={scan_limit})")
    return scanned, marked

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--in",dest="infile",required=True)
    ap.add_argument("--cache",default="cache.json")
    ap.add_argument("--workers",type=int,default=4)
    ap.add_argument("--rpm",type=int,default=120)
    ap.add_argument("--timeout",type=float,default=8)
    ap.add_argument("--max-retries",type=int,default=2)
    ap.add_argument("--min-sleep-ms",type=int,default=25)
    ap.add_argument("--pool-max",type=int,default=64)
    ap.add_argument("--backoff-base",type=float,default=0.6)
    ap.add_argument("--heartbeat",type=float,default=2.0)
    ap.add_argument("--future-timeout",type=float,default=300.0)
    ap.add_argument("--checkpoint",type=int,default=1000)
    ap.add_argument("--backend",choices=["requests","urllib"],default="requests")
    ap.add_argument("--ipv4",action="store_true")
    ap.add_argument("--insecure",action="store_true")
    ap.add_argument("--net-probe",action="store_true")
    ap.add_argument("--ua",default=DEFAULT_UA)
    ap.add_argument("--debug",action="store_true")
    ap.add_argument("--wikt-cache-root", default="../cache/wiktionary_cache")
    ap.add_argument("--wiki-cache-root", default="../cache/wikipedia_cache")
    ap.add_argument("--index-from-cache", dest="index_from_cache", action="store_true", default=True)
    ap.add_argument("--no-index-from-cache", dest="index_from_cache", action="store_false")
    ap.add_argument("--index-scan-limit", type=int, default=5000)

    args=ap.parse_args()

    wikt_dir=Path(args.wikt_cache_root)
    wiki_dir=Path(args.wiki_cache_root)
    wikt_dir.mkdir(parents=True,exist_ok=True)
    wiki_dir.mkdir(parents=True,exist_ok=True)

    warn(f"starting… words file: {Path(args.infile).resolve()} | workers:{args.workers} rpm:{args.rpm} pool:{args.pool_max}")

    if args.ipv4:
        _orig=socket.getaddrinfo
        def _v4(host,port,*a,**kw): return [ai for ai in _orig(host,port,*a,**kw) if ai[0]==socket.AF_INET]
        socket.getaddrinfo=_v4
        sys.stderr.write("[debug] forcing IPv4 only\n")

    words=[w.strip() for w in Path(args.infile).read_text(encoding="utf-8").splitlines() if w.strip()]
    total=len(words)
    warn(f"loaded words: {total}")
    known=0; wikt_only=0; wiki_only=0
    for _w in words:
        wikt_has = wikt_cache_path(wikt_dir,_w).exists() or has_negative_cache(wikt_dir, wiki_dir, _w, "wikt")
        wiki_has = wiki_cache_path(wiki_dir,_w).exists() or has_negative_cache(wikt_dir, wiki_dir, _w, "wiki")
        if wikt_has and wiki_has:
            known += 1
        elif wikt_has:
            wikt_only += 1
        elif wiki_has:
            wiki_only += 1
    warn(f"enqueue: known={known} (wikt-only:{wikt_only} wiki-only:{wiki_only}) unknown={total-known}")
    # --- Fast baseline estimate (sample up to 5000 words, no directory walks) ---
    sample_n = min(5000, total)
    if sample_n > 0:
        # uniform sampling without importing random for reproducibility: stride across list
        stride = max(1, total // sample_n)
        sampled = words[::stride][:sample_n]
        sample_hits = 0
        for _w in sampled:
            if wikt_cache_path(wikt_dir, _w).exists() and wiki_cache_path(wiki_dir, _w).exists():
                sample_hits += 1
        est_pct = (sample_hits / sample_n * 100.0)
        warn(f"Baseline cached (estimate): ~{est_pct:.2f}% based on {sample_n} samples")
    else:
        warn("Baseline cached (estimate): 100.00% (empty input)")
    # NOTE: we will compute the exact baseline on the fly during streaming, so we don't block here.


    # Baseline summary (fast existence check, no reads)
    cached_count = 0
    for _w in words:
        if wikt_cache_path(wikt_dir, _w).exists() and wiki_cache_path(wiki_dir, _w).exists():
            cached_count += 1
    cached_pct = (cached_count / total * 100.0) if total else 100.0
    warn(f"Baseline cached: {cached_count}/{total} ({cached_pct:.2f}%)")


    # Streaming enqueue of uncached
    limiter=TokenBucket(args.rpm,max(1,args.workers*2),args.min_sleep_ms)
    results=[]
    baseline = cached_count

    def print_heartbeat(inflight, done_count):
        from math import isfinite
        with _http_lock: c=_http_counts.copy()
        pct = (done_count/total*100.0) if total else 100.0
        sys.stderr.write(
            f"\rProgress: {pct:6.2f}% ({done_count}/{total}) | inflight:{inflight} "
            f"ok:{c['ok']} 403:{c['403']} 429:{c['429']} 503:{c['503']} other:{c['other']} "
            f"cache:{c['cache']} errors:{c['errors']}"
        )
        sys.stderr.flush()

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs=deque()
        fut_start={}
        fut_word={}
        last_beat=time.time()

        for i, w in enumerate(words, 1):
            wikt_has = wikt_cache_path(wikt_dir,w).exists() or has_negative_cache(wikt_dir, wiki_dir, w, "wikt")
            wiki_has = wiki_cache_path(wiki_dir,w).exists() or has_negative_cache(wikt_dir, wiki_dir, w, "wiki")
            if wikt_has and wiki_has:
                # we already know the outcome locally (cached html or negative-cache); skip worker
                pass
            else:
                f = ex.submit(_worker, w, wikt_dir, wiki_dir, limiter, args)
                futs.append(f)
                fut_start[f]=time.time(); fut_word[f]=w

            # Drain a bit to prevent runaway queue growth
            while futs and len(futs) > args.workers*2:
                try:
                    fut = futs.popleft()
                    r = fut.result(timeout=0.01)
                    results.append(r)
                    fut_start.pop(fut, None)
                    fut_word.pop(fut, None)
                except TimeoutError:
                    futs.appendleft(fut)
                    break

            now=time.time()
            if now-last_beat>=args.heartbeat:
                done_count = baseline + len(results)
                print_heartbeat(len(futs), done_count)
                last_beat=now

        # Done enqueueing — drain remaining
        while futs:
            fut = futs.popleft()
            try:
                r = fut.result(timeout=max(0.1,args.heartbeat))
                results.append(r)
            except TimeoutError:
                now=time.time()
                FUTURE_TIMEOUT = getattr(args, "future_timeout", 300.0)
                if fut in fut_start and now - fut_start[fut] > FUTURE_TIMEOUT:
                    _bump("errors");
                    name = fut_word.get(fut, '?')
                    warn(f"stale-future: dropping '{name}' after {now - fut_start[fut]:.1f}s")
                    fut_start.pop(fut, None); fut_word.pop(fut, None)
                    continue
                futs.append(fut)
                if now-last_beat>=args.heartbeat:
                    done_count = baseline + len(results)
                    print_heartbeat(len(futs), done_count)
                    last_beat=now
            except Exception as e:
                _bump("errors")
                results.append({"error":"future","detail":str(e)})
                now=time.time()
                if now-last_beat>=args.heartbeat:
                    done_count = baseline + len(results)
                    print_heartbeat(len(futs), done_count)
                    last_beat=now

    sys.stderr.write("\n")
    # Only newly processed results are written; cached can be merged later.
    Path(args.cache).write_text(json.dumps(results, indent=2), encoding="utf-8")
    warn(f"fast-resume baseline hits: {baseline}; new results written: {len(results)}")
    # Negative cache summary
    wikt_miss = 0
    wiki_miss = 0
    # Count miss markers for the words we saw this run to avoid slow directory walks
    for w in words:
        if has_negative_cache(wikt_dir, wiki_dir, w, "wikt"):
            wikt_miss += 1
        if has_negative_cache(wikt_dir, wiki_dir, w, "wiki"):
            wiki_miss += 1
    warn(f"negative-cache: wikt={wikt_miss} wiki={wiki_miss}")

if __name__=='__main__': main()
