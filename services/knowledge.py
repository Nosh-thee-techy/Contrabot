from pathlib import Path

import chromadb

DATA_DIR = Path(__file__).parent.parent / "data"
CHROMADB_DIR = DATA_DIR / "chromadb"


def get_chroma_client():
    CHROMADB_DIR.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(CHROMADB_DIR))


def query_knowledge_base(query: str, collection_name: str = "who_mec", num_results: int = 3) -> dict:
    try:
        client = get_chroma_client()
        collection = client.get_collection(name=collection_name)
        return collection.query(query_texts=[query], n_results=num_results)
    except Exception:
        return {}


def query_all_collections(query: str, num_results: int = 3) -> list[str]:
    chunks: list[str] = []
    for name in ("who_mec", "aphrc"):
        results = query_knowledge_base(query, collection_name=name, num_results=num_results)
        if results and results.get("documents"):
            chunks.extend(results["documents"][0])
    return chunks
