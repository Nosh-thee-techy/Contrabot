import os
from pathlib import Path
from dotenv import load_dotenv
import httpx
import hashlib

# Load .env from project root
project_root = Path(__file__).parent.parent
env_file = project_root / ".env"
if env_file.exists():
    load_dotenv(env_file)
else:
    load_dotenv()

# Lazy initialization: clients will be created on first use
_gemini_client = None
_openai_client = None


def _get_gemini_client():
    """Lazy-load Gemini client."""
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client
    
    key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    
    try:
        import google.genai as genai
        _gemini_client = genai.Client(api_key=key)
        return _gemini_client
    except Exception:
        return None


def _get_openai_client():
    """Lazy-load OpenAI client."""
    global _openai_client
    if _openai_client is not None:
        return _openai_client
    
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        return None
    
    try:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=key)
        return _openai_client
    except Exception:
        return None


# Anthropic key (optional)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


def _anthropic_completion(messages, model=None, max_tokens=500):
    """Simple Anthropic completion via REST using Messages API."""
    if not ANTHROPIC_API_KEY:
        return None
    payload = {
        "model": model or os.getenv("ANTHROPIC_CHAT_MODEL", "claude-3-haiku-20240307"),
        "messages": messages,
        "max_tokens": max_tokens,
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "Anthropic-Version": "2024-06-01",
    }
    try:
        resp = httpx.post("https://api.anthropic.com/v1/messages", json=payload, headers=headers, timeout=30)
        resp.raise_for_status()
        j = resp.json()
        # Standard Messages API response
        if "content" in j and j["content"]:
            first_block = j["content"][0]
            return first_block.get("text", "")
        return ""
    except Exception as e:
        return None


def _anthropic_embeddings(texts, model=None):
    """Anthropic embeddings not available in free tier; return None to fall back."""
    # Anthropic API does not provide embeddings endpoint for free/standard tier
    return None


def chat_completion(messages, model=None, temperature=0.7, max_tokens=500):
    """Return a text completion using Gemini (preferred) or OpenAI.

    `messages` is a list of dicts like OpenAI chat messages. For Gemini we
    concatenate messages into a single prompt.
    """
    # Anthropic preferred
    anthropic_resp = _anthropic_completion(messages, model=model, max_tokens=max_tokens)
    if anthropic_resp:
        return anthropic_resp

    # Gemini next
    gc = _get_gemini_client()
    if gc:
        prompt = "\n".join([m.get("content", "") for m in messages])
        model = model or os.getenv("GEMINI_CHAT_MODEL", "gemini-1.5-mini")
        resp = gc.models.generate_content(model=model, contents=prompt)
        # Response text is available as `text`
        return getattr(resp, "text", str(resp))

    # OpenAI fallback
    oc = _get_openai_client()
    if oc:
        model = model or "gpt-3.5-turbo"
        response = oc.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message["content"].strip()

    raise RuntimeError("No LLM client configured. Set GOOGLE_API_KEY or OPENAI_API_KEY in .env")


def _fallback_embeddings(texts, dim=384):
    """Generate deterministic embeddings from text hash without API calls."""
    embeddings = []
    for text in texts:
        # Create a hash of the text
        h = hashlib.sha256(text.encode()).digest()
        # Convert bytes to float vector of fixed dimension
        vec = []
        for i in range(dim):
            byte_idx = i % len(h)
            # Normalize to [-1, 1]
            val = (h[byte_idx] - 128) / 128.0
            vec.append(val)
        embeddings.append(vec)
    return embeddings


def get_embeddings(texts, model=None):
    """Return embeddings for a list of texts using Gemini (preferred) or OpenAI.

    Returns: list[list[float]]
    """
    def _parse_resp_embeddings(r):
        # Try several known shapes and return list of vectors
        if getattr(r, "embeddings", None):
            out = []
            for emb in r.embeddings:
                vals = getattr(emb, "values", None)
                if vals is None:
                    vals = emb.get("values") if isinstance(emb, dict) else None
                out.append(vals or [])
            return out
        if hasattr(r, "data") and isinstance(r.data, (list, tuple)):
            out = []
            for item in r.data:
                if isinstance(item, dict):
                    out.append(item.get("embedding") or item.get("values") or [])
                else:
                    # try attribute access
                    out.append(getattr(item, "embedding", getattr(item, "values", [])) or [])
            return out
        # Last resort: if the response itself looks like a single embedding
        if isinstance(r, (list, tuple)):
            return list(r)
        return []

    # Anthropic does not provide embeddings; skip to Gemini
    # Gemini path
    gc = _get_gemini_client()
    if gc:
        model = model or os.getenv("GEMINI_EMBED_MODEL", "gemini-embedding-2-preview")
        # Gemini embed_content accepts list of contents
        resp = gc.models.embed_content(model=model, contents=texts)
        embeddings = _parse_resp_embeddings(resp)

        # If Gemini returned a single embedding for the whole batch, fall back
        # to embedding each text individually in small batches to ensure
        # we get one vector per input text.
        if len(embeddings) != len(texts):
            per_text = []
            batch_size = 64
            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                r = gc.models.embed_content(model=model, contents=batch)
                parsed = _parse_resp_embeddings(r)
                if not parsed:
                    # If parsing still fails, raise for visibility
                    raise RuntimeError("Failed to parse Gemini embeddings response")
                per_text.extend(parsed)
            if len(per_text) == len(texts):
                return per_text
            # fallback to whatever we have
            return per_text or embeddings

        return embeddings

    # OpenAI fallback
    oc = _get_openai_client()
    if oc:
        model = model or "text-embedding-3-small"
        response = oc.embeddings.create(model=model, input=texts)
        return [item["embedding"] for item in response["data"]]

    # Final fallback: deterministic hash-based embeddings (no API required)
    return _fallback_embeddings(texts)
