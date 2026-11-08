#!/usr/bin/env python3
"""Discover Project Gutenberg EPUB catalogue records; do not assume global reuse rights."""
import argparse
import json
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ATOM = {"a": "http://www.w3.org/2005/Atom"}
ACQ = "http://opds-spec.org/acquisition"
USER_AGENT = "ULUGBEK-ASILBEK-PrivateLibraryDiscovery/1.0"


def discover(query: str, limit: int):
    url = "https://www.gutenberg.org/ebooks/search.opds/?" + urllib.parse.urlencode({"query": query})
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/atom+xml"})
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read(8_000_000)
    root = ET.fromstring(raw)
    items = []
    for entry in root.findall("a:entry", ATOM):
        title = (entry.findtext("a:title", default="", namespaces=ATOM) or "").strip()
        author_nodes = entry.findall("a:author/a:name", ATOM)
        author = "; ".join((node.text or "").strip() for node in author_nodes if node.text)
        links = entry.findall("a:link", ATOM)
        epub = next((link for link in links if (link.get("rel", "").startswith(ACQ)
                    and "epub" in link.get("type", "").lower())), None)
        landing = next((link for link in links if link.get("rel") == "alternate"), None)
        if not title or epub is None or not epub.get("href"):
            continue
        items.append({
            "collection": "project-gutenberg",
            "title": title,
            "author": author,
            "download_url": urllib.parse.urljoin(url, epub.get("href")),
            "source": urllib.parse.urljoin(url, landing.get("href")) if landing is not None else url,
            "license": "Project Gutenberg License; verify local country status",
            "rights_status": "rights-review-required"
        })
        if len(items) >= max(1, min(limit, 100)):
            break
    return items


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", default="science")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--output", default="knowledge-worker/archive-candidates.jsonl")
    args = parser.parse_args()
    items = discover(args.query, args.limit)
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as stream:
        for item in items:
            stream.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(json.dumps({"discovered": len(items), "output": str(target),
                      "note": "Candidates are not downloaded until rights_status is reviewed."}, ensure_ascii=False))


if __name__ == "__main__":
    main()
