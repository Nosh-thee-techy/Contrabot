# Data Use and Governance Documentation
**ContraBot — Multilingual AI Contraception Counselor**  
*Challenge: AI for Reproductive Health in Africa Innovation Challenge (DSA / APHRC)*  
*Team: RKO*  
*Date: July 2026*  

---

## 1. Overview of Datasets Utilized

ContraBot ingests and processes four primary datasets to calibrate its scoring models, populate its semantic vector search (RAG), and structure its clinical decision trees:

| Dataset | Provider / Source | License | Application in ContraBot |
|---|---|---|---|
| **WHO Medical Eligibility Criteria (5th Ed.)** | World Health Organization | CC BY-NC-SA 3.0 IGO | Ground truth for the safety screening rules and the primary RAG knowledge base. |
| **Reversing the Stall in Fertility (Western Kenya)** | APHRC / Challenge Dataset | Challenge License | Calibration of regional method preference coefficients. |
| **Unwanted Pregnancy in Nairobi Slums** | APHRC / Challenge Dataset | Challenge License | User profile calibration, barrier modeling, and clinic search radius optimization. |
| **CHV Decision-Support App (Nairobi)** | APHRC / Challenge Dataset | Challenge License | Structuring the CHW dashboard KPI panels and referral escalation logic. |

---

## 2. Data Privacy & Ethical Compliance Framework

Reproductive health counseling requires the highest standards of confidentiality and data security. ContraBot implements a "Privacy-by-Design" architecture across all interaction channels (USSD, WhatsApp, Web, CHW):

### A. Strict De-identification of Encounters
*   **No PII Storage**: Personal Identifiable Information (PII) such as phone numbers are never stored in plain text.
*   **Cryptographic Hashing**: User phone numbers (`MSISDN`) coming from USSD or WhatsApp are immediately hashed using **bcrypt** (with a secure salt) upon intake. The system uses these hashes solely as session keys to prevent duplicate submissions, with no way to reverse them to reveal the original number.
*   **Encounter Logs**: Consultation logs generated for regional health indicator analytics contain only:
    *   Target district (e.g., "Nairobi")
    *   Age bracket (e.g., "18–24")
    *   Recommended method (e.g., "implant")
    *   User acceptance status (Yes/No)
    *   No names, raw locations, or timestamp correlation windows are persisted.

### B. Session Lifecycle & Data Minimization
*   **Ephemeral Session Cache**: Active session states (such as answers to the 5 intake questions) are stored temporarily in a **Redis Session Store** with an expiration time (TTL) of exactly **30 minutes**. 
*   **Automatic Expiry**: Once the TTL expires, all intermediate user answers are permanently deleted from memory. Only the de-identified final recommendation outcome is recorded.

### C. Informed Consent & Channel Opt-In
*   **USSD Opt-in**: The USSD intake flow starts with an explicit language and privacy greeting screen. Proceeding to answer the age prompt constitutes active consent.
*   **WhatsApp / Web Opt-in**: The greeting message outlines that counseling is anonymous, private, and automated, providing a clear warning/disclaimer before collecting any health flags.

---

## 3. RAG Knowledge Ingestion & Chunking Strategy

To ensure high-precision semantic retrieval and eliminate LLM hallucinations, source materials are ingested using a structured pipeline:

1.  **Parsing & Cleaning**: PyPDF2 extracts text from the WHO MEC reference document, removing headers, footers, and page numbers.
2.  **Chunking Strategy**: Text is chunked using a sliding window approach:
    *   **Chunk Size**: 512 tokens.
    *   **Overlap**: 64 tokens (ensuring clinical context is not split across boundaries).
3.  **Embeddings**: Chunks are embedded locally using the `all-MiniLM-L6-v2` model (or fallback hash-based vector dimensions if offline) and saved in a persistent **ChromaDB** vector store.
4.  **Query Routing**: User queries are routed through a cosine similarity filter (top-k=2) to retrieve only relevant safety and side-effect context before generating prompts for the Claude/Gemini API.

---

## 4. Storage & Security Architecture

*   **Encryption at Rest**: Databases (PostgreSQL 15 and SQLite fallbacks) employ AES-256 encryption at rest.
*   **TLS 1.3 Enforcement**: All API requests between the client app, CHW dashboard, and the FastAPI backend are encrypted in transit using TLS 1.3.
*   **Open Science compliance**: In alignment with the Open Science Commitment, raw challenge microdata is **not** distributed or stored in public repositories. Only the ingestion scripts, code logic, and open-source embedding vectors are shared.
