from fastapi.testclient import TestClient
import app as worker


def test_health_is_available():
    client = TestClient(worker.app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "private-knowledge-worker"


def test_extract_requires_internal_token(monkeypatch):
    monkeypatch.setattr(worker, "TOKEN", "test-secret")
    client = TestClient(worker.app)
    response = client.post("/extract", content=b"not a file", headers={"X-Filename": "book.pdf"})
    assert response.status_code == 401


def test_extract_rejects_unsupported_file(monkeypatch):
    monkeypatch.setattr(worker, "TOKEN", "test-secret")
    client = TestClient(worker.app)
    response = client.post("/extract", content=b"some bytes",
        headers={"Authorization": "Bearer test-secret", "X-Filename": "book.docx"})
    assert response.status_code == 415


def test_embedding_requires_internal_token(monkeypatch):
    monkeypatch.setattr(worker, "TOKEN", "test-secret")
    client = TestClient(worker.app)
    response = client.post("/embed", json={"texts": ["salom dunyo"]})
    assert response.status_code == 401
