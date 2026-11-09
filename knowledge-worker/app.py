import io
import os
import re
import zipfile
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field

TOKEN = os.getenv("KNOWLEDGE_WORKER_TOKEN", "")
MODEL_ID = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
MAX_FILE_BYTES = int(os.getenv("MAX_FILE_BYTES", "52428800"))
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "2000000"))
app = FastAPI(title="Private Knowledge Worker", version="1.0.0")
_model = None
_model_lock = Lock()


def authorize(value: str | None):
    if not TOKEN or value != "Bearer " + TOKEN:
        raise HTTPException(status_code=401, detail="Internal service token required")


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=32)


@app.get("/health")
def health():
    return {"ok": True, "service": "private-knowledge-worker", "embedding_model": MODEL_ID,
            "model_loaded": _model is not None}


@app.post("/embed")
def embed(body: EmbedRequest, authorization: str | None = Header(default=None)):
    authorize(authorization)
    global _model
    if any(not isinstance(x, str) or not x.strip() or len(x) > 12000 for x in body.texts):
        raise HTTPException(status_code=422, detail="Each text must contain 1–12000 characters")
    try:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer
                _model = SentenceTransformer(MODEL_ID, device=os.getenv("EMBEDDING_DEVICE", "cpu"))
        vectors = _model.encode(body.texts, normalize_embeddings=True, batch_size=8,
                                convert_to_numpy=True, show_progress_bar=False)
        return {"model": MODEL_ID, "dimension": int(vectors.shape[1]),
                "vectors": vectors.astype("float32").tolist()}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Embedding model unavailable: " + type(exc).__name__)


@app.post("/extract")
async def extract(request: Request, authorization: str | None = Header(default=None),
                  x_filename: str = Header(default="document.pdf")):
    authorize(authorization)
    raw = await request.body()
    if not raw or len(raw) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File is empty or exceeds the 50 MB limit")
    name = Path(x_filename).name
    suffix = Path(name).suffix.lower()
    try:
        if suffix == ".pdf":
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw), strict=False)
            if reader.is_encrypted:
                raise HTTPException(status_code=422, detail="Encrypted PDF is not supported")
            if len(reader.pages) > 2000:
                raise HTTPException(status_code=413, detail="PDF exceeds 2000 pages")
            sections = []
            for number, page in enumerate(reader.pages, 1):
                text = (page.extract_text() or "").strip()
                if text:
                    sections.append(f"\n[Page {number}]\n{text}")
                if sum(map(len, sections)) > MAX_TEXT_CHARS:
                    break
            extracted = "\n".join(sections)
            pages = len(reader.pages)
        elif suffix == ".epub":
            if not zipfile.is_zipfile(io.BytesIO(raw)):
                raise HTTPException(status_code=422, detail="Invalid EPUB archive")
            from ebooklib import epub, ITEM_DOCUMENT
            from bs4 import BeautifulSoup
            book = epub.read_epub(io.BytesIO(raw), options={"ignore_ncx": True})
            sections = []
            for item in book.get_items_of_type(ITEM_DOCUMENT):
                soup = BeautifulSoup(item.get_content(), "html.parser")
                for node in soup(["script", "style", "nav"]):
                    node.decompose()
                chapter = re.sub(r"\s+", " ", soup.get_text(" ", strip=True)).strip()
                if chapter:
                    sections.append(chapter)
                if sum(map(len, sections)) > MAX_TEXT_CHARS:
                    break
            extracted = "\n\n".join(sections)
            pages = len(sections)
        else:
            raise HTTPException(status_code=415, detail="Only PDF and EPUB files are supported")
        extracted = extracted[:MAX_TEXT_CHARS].strip()
        if len(extracted) < 80:
            raise HTTPException(status_code=422, detail="No readable text found; scanned PDF needs OCR")
        return {"ok": True, "filename": name, "format": suffix[1:],
                "sections": pages, "characters": len(extracted), "text": extracted}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Document extraction failed: " + type(exc).__name__)
