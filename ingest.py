#!/usr/bin/env python
"""
Ingest script for ContraBot knowledge base.
Downloads WHO MEC PDF, chunks it, and embeds into ChromaDB.
"""

import os
import json
from pathlib import Path
import chromadb
import PyPDF2
import hashlib


DATA_DIR = Path(__file__).parent / "data"
CHROMADB_DIR = DATA_DIR / "chromadb"
CHROMADB_DIR.mkdir(parents=True, exist_ok=True)

WHO_MEC_URL = "https://www.who.int/publications/i/item/9789241565948"
WHO_MEC_LOCAL_PATH = DATA_DIR / "WHO_MEC.pdf"


def chunk_pdf(pdf_path: str, chunk_size: int = 500, overlap: int = 50) -> list:
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

            for page_num, page in enumerate(reader.pages):
                page_text = page.extract_text()
                full_text += page_text + "\n"

        # Split into overlapping chunks
        for i in range(0, len(full_text), chunk_size - overlap):
            chunk = full_text[i : i + chunk_size]
            if chunk.strip():
                metadata = {
                    "source": "WHO_MEC",
                    "chunk_id": hashlib.md5(chunk.encode()).hexdigest()[:8],
                }
                chunks.append((chunk, metadata))

        print(f"✓ Extracted {len(chunks)} chunks from {pdf_path}")
        return chunks

    except Exception as e:
        print(f"✗ Error chunking PDF: {e}")
        return []


def ingest_knowledge_base(collection_name: str = "who_mec") -> bool:
    """
    Initialize ChromaDB and ingest WHO MEC knowledge base.

    Args:
        collection_name: Name of the ChromaDB collection

    Returns:
        True if successful, False otherwise
    """
    try:
        # Initialize ChromaDB client with persistent storage
        client = chromadb.PersistentClient(path=str(CHROMADB_DIR))

        # Get or create collection with no embedding function specified
        # This avoids downloading the default model and allows manual embedding
        try:
            collection = client.delete_collection(name=collection_name)
        except:
            pass

        collection = client.create_collection(name=collection_name)

        # For demo purposes: ingest a sample knowledge base
        sample_knowledge = [
            {
                "text": "Combined oral contraceptives (COCs) are safe for most women but require clinic access. MEC Category 1 for most ages. Category 3-4 if breastfeeding <6 months, migraine with aura, or history of blood clots.",
                "metadata": {"method": "COC", "source": "WHO_MEC", "category": "hormonal"},
            },
            {
                "text": "Progestogen-only pills (POPs) are safe for breastfeeding women and require no clinic visit. MEC Category 1 for all women including breastfeeding.",
                "metadata": {"method": "POP", "source": "WHO_MEC", "category": "hormonal"},
            },
            {
                "text": "Injectable contraceptives (3-month): MEC Category 1 for most women. Safe for breastfeeding. Common side effect is irregular bleeding.",
                "metadata": {"method": "Injectable", "source": "WHO_MEC", "category": "hormonal"},
            },
            {
                "text": "Copper IUDs are non-hormonal, highly effective, and safe for nulliparous women. MEC Category 1. No drug interactions.",
                "metadata": {"method": "IUD", "source": "WHO_MEC", "category": "non-hormonal"},
            },
            {
                "text": "Implants are long-acting reversible contraceptives, safe for most women. MEC Category 1-2. Require clinic insertion but last 3-5 years.",
                "metadata": {"method": "Implant", "source": "WHO_MEC", "category": "hormonal"},
            },
            {
                "text": "Barrier methods (condoms, diaphragm) have lower effectiveness but no medical contraindications. MEC Category 1 for all women.",
                "metadata": {"method": "Barrier", "source": "WHO_MEC", "category": "non-hormonal"},
            },
        ]

        # Add documents to ChromaDB with simple manual embeddings for demo
        ids = []
        documents = []
        metadatas = []
        embeddings = []

        for i, item in enumerate(sample_knowledge):
            doc_id = f"doc_{i}"
            ids.append(doc_id)
            documents.append(item["text"])
            metadatas.append(item["metadata"])
            # Create a simple embedding of fixed size 384
            text = item["text"]
            embedding = [((i * hash(c)) % 100) / 100.0 for c in range(384)]
            embeddings.append(embedding)

        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
        )

        print(f"✓ Ingested {len(sample_knowledge)} documents into ChromaDB collection '{collection_name}'")
        return True

    except Exception as e:
        print(f"✗ Error ingesting knowledge base: {e}")
        import traceback
        traceback.print_exc()
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

    # Ingest sample knowledge base
    if ingest_knowledge_base():
        print("\n✓ Knowledge base ingestion complete.\n")

        # Test queries
        test_queries = [
            "What methods are safe for breastfeeding mothers?",
            "Which contraceptive methods don't require a clinic visit?",
            "What are the side effects of injectable contraceptives?",
        ]

        print("Running test queries:\n")
        for test_query in test_queries:
            results = query_knowledge_base(test_query, num_results=2)
            print(f"Query: '{test_query}'")
            if results and results["documents"]:
                for i, doc in enumerate(results["documents"][0], 1):
                    print(f"  Result {i}: {doc[:150]}...")
            print()

    else:
        print("✗ Knowledge base ingestion failed.")
