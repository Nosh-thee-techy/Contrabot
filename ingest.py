#!/usr/bin/env python
"""
Ingest script for ContraBot knowledge base.
Ingests WHO MEC PDF and APHRC structured datasets into ChromaDB.
"""

import hashlib
import json
from pathlib import Path

import chromadb
import PyPDF2

from app.openai_client import get_embeddings

DATA_DIR = Path(__file__).parent / "data"
CHROMADB_DIR = DATA_DIR / "chromadb"
APHRC_DIR = DATA_DIR / "aphrc"
CHROMADB_DIR.mkdir(parents=True, exist_ok=True)

WHO_MEC_LOCAL_PATH = CHROMADB_DIR / "WHO_MEC.pdf"
APHRC_JSON_PATH = APHRC_DIR / "records.json"


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 200, source: str = "unknown", extra_meta: dict | None = None) -> list:
    chunks = []
    extra_meta = extra_meta or {}
    for i in range(0, len(text), chunk_size - overlap):
        chunk = text[i : i + chunk_size]
        if chunk.strip():
            metadata = {"source": source, "chunk_id": hashlib.md5(chunk.encode()).hexdigest()[:8], **extra_meta}
            chunks.append((chunk, metadata))
    return chunks


def chunk_pdf(pdf_path: str, chunk_size: int = 800, overlap: int = 200) -> list:
    chunks = []
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            full_text = ""
            for page in reader.pages:
                full_text += (page.extract_text() or "") + "\n"
        return chunk_text(full_text, chunk_size, overlap, source="WHO_MEC")
    except Exception as exc:
        print(f"Error chunking PDF: {exc}")
        return chunks


def chunk_aphrc_records(records_path: Path) -> list:
    if not records_path.exists():
        print(f"APHRC data not found at {records_path}")
        return []
    with open(records_path, encoding="utf-8") as f:
        records = json.load(f)
    chunks = []
    for rec in records:
        text = rec.get("text", "")
        if not text.strip():
            continue
        meta = {
            "source": "APHRC",
            "region": rec.get("region", "East Africa"),
            "method": rec.get("method", "unknown"),
            "discontinuation_reason": rec.get("discontinuation_reason", "none"),
        }
        chunks.extend(chunk_text(text, chunk_size=600, overlap=100, source="APHRC", extra_meta=meta))
    print(f"Prepared {len(chunks)} APHRC chunks")
    return chunks


def _ingest_collection(client, collection_name: str, chunks: list) -> bool:
    if not chunks:
        return False
    try:
        try:
            client.delete_collection(name=collection_name)
        except Exception:
            pass
        collection = client.create_collection(name=collection_name)
        texts = [t for t, _ in chunks]
        metadatas = [m for _, m in chunks]
        ids = [f"{collection_name}_{i}" for i in range(len(chunks))]
        print(f"Generating embeddings for {collection_name} ({len(chunks)} chunks)...")
        embeddings = get_embeddings(texts)
        collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
        print(f"Ingested {len(chunks)} chunks into '{collection_name}'")
        return True
    except Exception as exc:
        print(f"Error ingesting {collection_name}: {exc}")
        return False


def ingest_knowledge_base() -> bool:
    client = chromadb.PersistentClient(path=str(CHROMADB_DIR))
    ok = False

    if WHO_MEC_LOCAL_PATH.exists():
        who_chunks = chunk_pdf(str(WHO_MEC_LOCAL_PATH))
        ok = _ingest_collection(client, "who_mec", who_chunks) or ok
    else:
        print(f"WHO MEC PDF not found at {WHO_MEC_LOCAL_PATH}")

    aphrc_chunks = chunk_aphrc_records(APHRC_JSON_PATH)
    if aphrc_chunks:
        ok = _ingest_collection(client, "aphrc", aphrc_chunks) or ok

    return ok


def query_knowledge_base(query: str, collection_name: str = "who_mec", num_results: int = 3) -> dict:
    try:
        client = chromadb.PersistentClient(path=str(CHROMADB_DIR))
        collection = client.get_collection(name=collection_name)
        return collection.query(query_texts=[query], n_results=num_results)
    except Exception as exc:
        print(f"Query error: {exc}")
        return {}


if __name__ == "__main__":
    print("Starting ContraBot knowledge base ingestion...\n")
    if ingest_knowledge_base():
        print("\nIngestion complete.\n")
        for q in [
            "What methods are safe for breastfeeding mothers?",
            "Why do women discontinue injectables in Nairobi?",
        ]:
            print(f"Query: {q}")
            for coll in ("who_mec", "aphrc"):
                r = query_knowledge_base(q, collection_name=coll, num_results=1)
                if r.get("documents"):
                    print(f"  [{coll}] {r['documents'][0][0][:120]}...")
            print()
    else:
        print("Ingestion failed or no data found.")
