import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def chat_completion(messages, model="gpt-3.5-turbo", temperature=0.7, max_tokens=500):
    if not client:
        raise RuntimeError("OPENAI_API_KEY is not configured in the environment.")

    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return response.choices[0].message["content"].strip()


def get_embeddings(texts, model="text-embedding-3-small"):
    if not client:
        raise RuntimeError("OPENAI_API_KEY is not configured in the environment.")

    response = client.embeddings.create(
        model=model,
        input=texts,
    )
    return [item["embedding"] for item in response.data]
