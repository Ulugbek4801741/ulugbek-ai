import gzip
import json
from pathlib import Path

import pytest

import public_archive as archive


def record(**overrides):
    value = {
        "title": "Open textbook",
        "text": "This is openly licensed educational material about mathematics.",
        "source_url": "https://example.org/book",
        "license": "CC BY 4.0",
        "rights_status": "open-license",
        "language": "en",
        "collected_at": "2026-11-17T00:00:00+00:00",
    }
    value.update(overrides)
    return value


def test_rejects_private_or_unapproved_fields():
    with pytest.raises(archive.ArchiveError):
        archive.validate_record(record(email="user@example.com"))
    with pytest.raises(archive.ArchiveError):
        archive.validate_record(record(rights_status="rights-review-required"))


def test_rejects_contact_details_and_secrets():
    with pytest.raises(archive.ArchiveError):
        archive.validate_record(record(text="Contact admin@example.org for access"))
    with pytest.raises(archive.ArchiveError):
        archive.validate_record(record(text="api_key=do-not-store"))


def test_requires_https_source():
    with pytest.raises(archive.ArchiveError):
        archive.validate_record(record(source_url="http://example.org/book"))


def test_loads_only_deduplicated_valid_public_records(tmp_path):
    source = tmp_path / "public.jsonl"
    good = record()
    bad = record(rights_status="rights-review-required")
    source.write_text(
        json.dumps(good) + "\n" + json.dumps(good) + "\n" + json.dumps(bad) + "\n",
        encoding="utf-8",
    )
    rows, rejected = archive.load_public_records(source)
    assert rows == [good]
    assert rejected == 1


def test_gzip_snapshot_round_trip():
    rows = [archive.validate_record(record())]
    compressed = gzip.compress(b"".join(archive._json_bytes(x) for x in rows), mtime=0)
    assert json.loads(gzip.decompress(compressed).decode().splitlines()[0]) == rows[0]
