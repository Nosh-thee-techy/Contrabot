# ContraBot — Phase 1

Minimal FastAPI skeleton and setup for Phase 1.

Getting started (local)

1. Create a Python virtual environment and activate it:

   ```bash
   python -m venv .venv
   # Windows
   .\.venv\Scripts\activate
   # macOS / Linux
   source .venv/bin/activate
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and populate your keys (OpenAI, Africa's Talking, WhatsApp):

   ```bash
   copy .env.example .env
   ```

4. Run the server:

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

Railway / Render

- Create a free account on Railway or Render and connect this GitHub repo. Use the `Dockerfile` or the `uvicorn` command above as the start command. Add environment variables from `.env` in the platform's settings.

USSD webhook setup

- Africa's Talking will call your app at `/ussd` with `sessionId`, `serviceCode`, `phoneNumber`, and `text`.
- The backend returns `CON` to continue the session or `END` to close it.
- Example local test URL: `http://localhost:8000/ussd`

Accounts to create (manual steps)

- Africa's Talking: create a free sandbox and get `AT_API_KEY` and `AT_USERNAME`.
- Meta for Developers: set up a WhatsApp Business sandbox and obtain `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID`.
- OpenAI: retrieve your API key from https://platform.openai.com and set `OPENAI_API_KEY`.

Next steps (Phase 1 -> Phase 2)

- Wire Africa's Talking USSD endpoints and webhook handlers.
- Implement the LLM recommendation engine and RAG over WHO MEC.
