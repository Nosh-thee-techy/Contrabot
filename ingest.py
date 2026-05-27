#!/usr/bin/env python
"""
Ingest script for ContraBot knowledge base.
Uses the WHO MEC PDF already stored in the repo and embeds chunks into ChromaDB.
"""

from pathlib import Path
import chromadb
import PyPDF2
import hashlib
from app.openai_client import get_embeddings


DATA_DIR = Path(__file__).parent / "data"
CHROMADB_DIR = DATA_DIR / "chromadb"
CHROMADB_DIR.mkdir(parents=True, exist_ok=True)

WHO_MEC_LOCAL_PATH = CHROMADB_DIR / "WHO_MEC.pdf"


def chunk_pdf(pdf_path: str, chunk_size: int = 800, overlap: int = 200) -> list:
    """
    Extract text from PDF and chunk it into overlapping segments.

    Args:
        pdf_path: Path to the PDF file
        chunk_size: Approximate chunk size in characters
        overlap: Character overlap between chunks

    Returns:
        List of (text, metadata) tuples
    """
    chunks = []

    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            full_text = ""

            for page in reader.pages:
                page_text = page.extract_text() or ""
                full_text += page_text + "\n"

        for i in range(0, len(full_text), chunk_size - overlap):
            chunk = full_text[i : i + chunk_size]
            if chunk.strip():
                metadata = {
                    "source": "WHO_MEC",
                    "chunk_id": hashlib.md5(chunk.encode()).hexdigest()[:8],
                }
                chunks.append((chunk, metadata))

        print(f"Extracted {len(chunks)} chunks from {pdf_path}")
        return chunks

    except Exception as e:
        print(f"Error chunking PDF: {e}")
        return []


def ingest_knowledge_base(collection_name: str = "who_mec") -> bool:
    """
    Initialize ChromaDB and ingest WHO MEC knowledge base.

    Args:
        collection_name: Name of the ChromaDB collection

    Returns:
        True if successful, False otherwise
    """
    if not WHO_MEC_LOCAL_PATH.exists():
        print(f"✗ WHO MEC PDF not found at {WHO_MEC_LOCAL_PATH}")
        return False

    print(f"Using PDF at: {WHO_MEC_LOCAL_PATH}")
    chunks = chunk_pdf(str(WHO_MEC_LOCAL_PATH))
    if not chunks:
        return False

    try:
        client = chromadb.PersistentClient(path=str(CHROMADB_DIR))
        try:
            client.delete_collection(name=collection_name)
        except Exception:
            pass

        collection = client.create_collection(name=collection_name)

        texts = [text for text, metadata in chunks]
        metadatas = [metadata for text, metadata in chunks]
        ids = [f"chunk_{i}" for i in range(len(chunks))]

        print("Generating embeddings for WHO MEC chunks...")
        embeddings = get_embeddings(texts)

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )

        print(f"Ingested {len(chunks)} WHO MEC chunks into ChromaDB collection '{collection_name}'")
        return True

    except Exception as e:
        print(f"Error ingesting knowledge base: {e}")
        return False


def query_knowledge_base(query: str, collection_name: str = "who_mec", num_results: int = 3) -> list:
    """
    Query the ChromaDB knowledge base.

    Args:
        query: Search query string
        collection_name: Name of the ChromaDB collection
        num_results: Number of results to return

    Returns:
        List of relevant documents
    """
    try:
        client = chromadb.PersistentClient(path=str(CHROMADB_DIR))
        collection = client.get_collection(name=collection_name)
        results = collection.query(query_texts=[query], n_results=num_results)
        return results

    except Exception as e:
        print(f"✗ Error querying knowledge base: {e}")
        return []


if __name__ == "__main__":
    print("Starting ContraBot knowledge base ingestion...\n")

    if ingest_knowledge_base():
        print("\nKnowledge base ingestion complete.\n")

        test_queries = [
            "What methods are safe for breastfeeding mothers?",
            "Which contraceptive methods don't require a clinic visit?",
            "What are the side effects of injectable contraceptives?",
        ]

        print("Running test queries:\n")
        for test_query in test_queries:
            results = query_knowledge_base(test_query, num_results=2)
            print(f"Query: '{test_query}'")
            if results and results.get("documents"):
                for i, doc in enumerate(results["documents"][0], 1):
                    print(f"  Result {i}: {doc[:150]}...")
            print()

    else:
        print("Knowledge base ingestion failed.")
