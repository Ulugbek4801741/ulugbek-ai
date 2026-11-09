import socket
import urllib.error
import urllib.request

import pytest

import archive_ingest


def test_redirect_handler_rejects_redirect_before_following():
    handler = archive_ingest._RejectRedirects()
    request = urllib.request.Request("https://public.example/book.pdf")

    with pytest.raises(urllib.error.HTTPError) as error:
        handler.redirect_request(
            request, None, 302, "Found", {}, "http://127.0.0.1/private"
        )

    assert error.value.code == 302
    assert "Redirects are disabled" in error.value.reason


def test_download_uses_redirect_rejecting_opener(tmp_path, monkeypatch):
    opened = {}

    class RedirectingOpener:
        def open(self, request, timeout):
            opened["url"] = request.full_url
            return opened["handler"].redirect_request(
                request, None, 302, "Found", {}, "http://127.0.0.1/private"
            )

    def fake_build_opener(*handlers):
        opened["handler"] = next(
            handler for handler in handlers
            if isinstance(handler, archive_ingest._RejectRedirects)
        )
        return RedirectingOpener()

    monkeypatch.setattr(
        archive_ingest.socket,
        "getaddrinfo",
        lambda *args, **kwargs: [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))
        ],
    )
    monkeypatch.setattr(archive_ingest.urllib.request, "build_opener", fake_build_opener)

    item = {
        "title": "Example book",
        "download_url": "https://public.example/book.pdf",
        "rights_status": "open-license",
        "license": "CC BY 4.0",
    }

    with pytest.raises(urllib.error.HTTPError):
        archive_ingest.download(item, tmp_path, 1024)

    assert opened["url"] == item["download_url"]
    assert list(tmp_path.iterdir()) == []
