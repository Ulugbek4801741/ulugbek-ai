#!/usr/bin/env python3
"""Publish/restore an allowlisted, public-only ULUGBEK knowledge snapshot.

No conversation history, user profile, credentials, private uploads, or arbitrary
metadata are accepted. Upload requires a GitHub token with Contents: write.
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import gzip
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OWNER = os.getenv("ARCHIVE_GITHUB_OWNER", "Ulugbek4801741")
REPO = os.getenv("ARCHIVE_GITHUB_REPO", "ulugbek-ai")
BRANCH = os.getenv("ARCHIVE_GITHUB_BRANCH", "public-knowledge-archive")
API = "https://api.github.com"
RAW = "https://raw.githubusercontent.com"
ALLOWED_RIGHTS = {"open-license", "public-domain-global", "permission-granted"}
ALLOWED_FIELDS = {"title", "text", "source_url", "license", "rights_status", "language", "collected_at"}
MAX_TEXT = 12000
MAX_COMPRESSED = 20 * 1024 * 1024
EMAIL = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
PHONE = re.compile(r"(?<!\w)(?:\+?\d[\d ()-]{7,}\d)(?!\w)")
SECRET = re.compile(r"(?i)(api[_ -]?key|access[_ -]?token|password|passwd|secret)\\s*[:=]")

class ArchiveError(ValueError):
    pass

def _json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")

def validate_record(raw):
    if not isinstance(raw, dict) or set(raw) - ALLOWED_FIELDS:
        raise ArchiveError("record contains unsupported fields")
    record = {k: str(raw.get(k, "")).strip() for k in ALLOWED_FIELDS}
    if not all(record[k] for k in ("title", "text", "source_url", "license", "rights_status")):
        raise ArchiveError("required public-source fields are missing")
    if record["rights_status"] not in ALLOWED_RIGHTS:
        raise ArchiveError("source rights are not cleared for archival")
    parsed = urllib.parse.urlparse(record["source_url"])
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ArchiveError("source_url must be a public HTTPS URL")
    if len(record["title"]) > 500 or len(record["text"]) > MAX_TEXT:
        raise ArchiveError("title or text exceeds archive limits")
    searchable = record["title"] + "\n" + record["text"]
    if EMAIL.search(searchable) or PHONE.search(searchable) or SECRET.search(searchable):
        raise ArchiveError("possible personal contact or secret detected; record rejected")
    if not record["language"]:
        record["language"] = "und"
    if not record["collected_at"]:
        record["collected_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    return record

def load_public_records(source: Path):
    if not source.exists():
        raise ArchiveError(f"public knowledge export not found: {source}")
    records, seen, rejected = [], set(), 0
    for line in source.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        try:
            item = validate_record(json.loads(line))
        except (json.JSONDecodeError, ArchiveError):
            rejected += 1
            continue
        digest = hashlib.sha256(_json_bytes(item)).hexdigest()
        if digest not in seen:
            seen.add(digest)
            records.append(item)
    records.sort(key=lambda x: (x["source_url"], x["title"], x["language"]))
    return records, rejected

def request_json(url, token=None, method="GET", payload=None):
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "ULUGBEK-AI-Public-Knowledge-Archive"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=60) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8")) if raw else {}

def github_path(path):
    return f"{API}/repos/{OWNER}/{REPO}/contents/{urllib.parse.quote(path, safe='/')}"

def put_file(path, content, message, token):
    url = github_path(path)
    payload = {"message": message, "content": base64.b64encode(content).decode("ascii"), "branch": BRANCH}
    try:
        current = request_json(url + "?ref=" + urllib.parse.quote(BRANCH), token)
        payload["sha"] = current["sha"]
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
    return request_json(url, token, "PUT", payload)

def publish(source: Path):
    token = os.getenv("GITHUB_ARCHIVE_TOKEN", "").strip()
    if not token:
        raise ArchiveError("GITHUB_ARCHIVE_TOKEN is required for publishing")
    records, rejected = load_public_records(source)
    if not records:
        raise ArchiveError("no eligible public knowledge records; nothing was uploaded")
    body = b"".join(_json_bytes(row) for row in records)
    compressed = gzip.compress(body, compresslevel=9, mtime=0)
    if len(compressed) > MAX_COMPRESSED:
        raise ArchiveError("compressed snapshot exceeds 20 MiB; split the export")
    digest = hashlib.sha256(compressed).hexdigest()
    now = dt.datetime.now(dt.timezone.utc)
    stamp = now.strftime("%Y%m%dT%H%M%SZ")
    archive_path = f"snapshots/{stamp}-{digest[:12]}.jsonl.gz"
    put_file(archive_path, compressed, f"Archive public knowledge snapshot {stamp}", token)
    manifest = {
        "schema_version": 1,
        "created_at": now.isoformat(),
        "archive_path": archive_path,
        "sha256": digest,
        "compressed_bytes": len(compressed),
        "records": len(records),
        "rejected_records": rejected,
        "format": "gzip-jsonl",
        "privacy": "public-source-only; no conversations or credentials"
    }
    put_file("latest.json", _json_bytes(manifest), f"Update public knowledge archive manifest {stamp}", token)
    return manifest

def restore(destination: Path):
    manifest_url = f"{RAW}/{OWNER}/{REPO}/{BRANCH}/latest.json"
    with urllib.request.urlopen(manifest_url, timeout=60) as response:
        manifest = json.loads(response.read().decode("utf-8"))
    archive_url = f"{RAW}/{OWNER}/{REPO}/{BRANCH}/" + manifest["archive_path"]
    with urllib.request.urlopen(archive_url, timeout=120) as response:
        compressed = response.read(MAX_COMPRESSED + 1)
    if len(compressed) > MAX_COMPRESSED or hashlib.sha256(compressed).hexdigest() != manifest["sha256"]:
        raise ArchiveError("archive size or SHA-256 verification failed")
    raw = gzip.decompress(compressed)
    rows = [validate_record(json.loads(line)) for line in raw.decode("utf-8").splitlines() if line.strip()]
    if len(rows) != int(manifest["records"]):
        raise ArchiveError("restored record count does not match manifest")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = destination.with_suffix(destination.suffix + ".tmp")
    temp.write_bytes(b"".join(_json_bytes(row) for row in rows))
    os.replace(temp, destination)
    return {"restored": len(rows), "destination": str(destination), "sha256": manifest["sha256"]}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("publish")
    p.add_argument("--input", default=os.getenv("PUBLIC_KNOWLEDGE_EXPORT", "knowledge-worker/public-knowledge.jsonl"))
    r = sub.add_parser("restore")
    r.add_argument("--output", default=os.getenv("PUBLIC_KNOWLEDGE_RESTORE", "knowledge-worker/restored-public-knowledge.jsonl"))
    args = parser.parse_args()
    try:
        result = publish(Path(args.input)) if args.command == "publish" else restore(Path(args.output))
        print(json.dumps(result, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": type(exc).__name__, "message": str(exc)}), file=sys.stderr)
        raise SystemExit(1)

if __name__ == "__main__":
    main()
