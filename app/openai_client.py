import os
import openai
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY


def chat_completion(messages, model="gpt-3.5-turbo", temperature=0.7, max_tokens=500):
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured in the environment.")

    response = openai.ChatCompletion.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return response.choices[0].message["content"].strip()
