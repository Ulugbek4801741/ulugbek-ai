#!/usr/bin/env python3
"""Download only explicitly cleared PDF/EPUB items into private persistent storage."""
import argparse
import hashlib
import json
import os
import re
import time
import socket
import ipaddress
import urllib.parse
import urllib.request
from pathlib import Path

ALLOWED_RIGHTS = {"open-license", "public-domain-global", "permission-granted"}
MAX_DEFAULT = 100 * 1024 * 1024


def safe_name(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", Path(value).name)[:180] or "book"


def download(item: dict, root: Path, max_bytes: int):
    url = str(item.get("download_url", "")).strip()
    rights = str(item.get("rights_status", "")).strip().lower()
    license_name = str(item.get("license", "")).strip()
    if rights not in ALLOWED_RIGHTS or not license_name:
        return {"status": "skipped-rights-review", "title": item.get("title", "")}
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        return {"status": "skipped-invalid-url", "title": item.get("title", "")}
    if parsed.username is not None or parsed.password is not None:
        return {"status": "skipped-invalid-url", "title": item.get("title", "")}
    try:
        addresses = {entry[4][0] for entry in socket.getaddrinfo(parsed.hostname, 443, type=socket.SOCK_STREAM)}
        if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
            return {"status": "skipped-nonpublic-host", "title": item.get("title", "")}
    except Exception:
        return {"status": "skipped-unresolvable-host", "title": item.get("title", "")}
    ext = Path(parsed.path).suffix.lower()
    if ext not in {".pdf", ".epub"}:
        return {"status": "skipped-unsupported-format", "title": item.get("title", "")}
    request = urllib.request.Request(url, headers={"User-Agent": "PrivateKnowledgeArchive/1.0"})
    digest = hashlib.sha256()
    data = bytearray()
    with urllib.request.urlopen(request, timeout=60) as response:
        final = urllib.parse.urlparse(response.geturl())
        if final.scheme != "https" or final.hostname != parsed.hostname:
            raise ValueError("Cross-host or non-HTTPS redirect rejected")
        while True:
            part = response.read(1024 * 1024)
            if not part:
                break
            data.extend(part)
            digest.update(part)
            if len(data) > max_bytes:
                raise ValueError("File exceeds configured size limit")
    if ext == ".pdf" and not data.startswith(b"%PDF"):
        raise ValueError("Downloaded file is not a PDF")
    if ext == ".epub" and not data.startswith(b"PK"):
        raise ValueError("Downloaded file is not a ZIP/EPUB")
    source_id = hashlib.sha256((url + license_name).encode()).hexdigest()[:16]
    folder = root / safe_name(str(item.get("collection", "open-library"))) / source_id
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / (digest.hexdigest() + ext)
    if not target.exists():
        target.write_bytes(data)
    metadata = {
        "title": str(item.get("title", ""))[:500], "author": str(item.get("author", ""))[:300],
        "download_url": url, "license": license_name, "rights_status": rights,
        "source": str(item.get("source", ""))[:500], "sha256": digest.hexdigest(),
        "bytes": len(data), "stored_file": str(target), "downloaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }
    (folder / (digest.hexdigest() + ".metadata.json")).write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    api_url = os.getenv("KNOWLEDGE_API_URL", "").rstrip("/")
    api_token = os.getenv("KNOWLEDGE_API_TOKEN", "")
    ingested = False
    if api_url and api_token:
        api_path = os.getenv("KNOWLEDGE_API_PATH", "/knowledge/upload")
        auth_header = os.getenv("KNOWLEDGE_API_AUTH_HEADER", "X-Owner-Token")
        upload = urllib.request.Request(api_url + api_path, data=bytes(data), method="POST",
            headers={auth_header: api_token, "X-Filename": safe_name(str(item.get("title", "book")) + ext),
                     "Content-Type": "application/pdf" if ext == ".pdf" else "application/epub+zip"})
        with urllib.request.urlopen(upload, timeout=180) as response:
            ingested = 200 <= response.status < 300
    return {"status": "downloaded", "ingested": ingested, "title": metadata["title"],
            "bytes": len(data), "sha256": digest.hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="knowledge-worker/archive-queue.jsonl")
    parser.add_argument("--storage", default=os.getenv("KNOWLEDGE_ARCHIVE_DIR", "/var/data/books"))
    parser.add_argument("--max-items", type=int, default=100)
    parser.add_argument("--max-mb", type=int, default=100)
    args = parser.parse_args()
    root = Path(args.storage)
    root.mkdir(parents=True, exist_ok=True)
    manifest = Path(args.manifest)
    if not manifest.exists():
        raise SystemExit(f"Manifest not found: {manifest}")
    results = []
    with manifest.open(encoding="utf-8") as stream:
        for line in stream:
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            if len(results) >= args.max_items:
                break
            item = json.loads(line)
            try:
                results.append(download(item, root, args.max_mb * 1024 * 1024))
            except Exception as exc:
                results.append({"status": "error", "title": item.get("title", ""), "error": type(exc).__name__})
    report = root / "archive-ingest-report.json"
    report.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"processed": len(results), "downloaded": sum(x["status"] == "downloaded" for x in results),
                      "report": str(report)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
