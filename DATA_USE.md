# Data Use and Governance Documentation
**ContraBot — Multilingual AI Contraception Counselor**  
*Challenge: AI for Reproductive Health in Africa Innovation Challenge (DASSA / APHRC)*  
*Team: RKO*  
*Date: July 2026*  

---

## A. Data Sources (Data Inventory)

ContraBot utilizes a combination of challenge-specific microdata and public clinical/geospatial datasets to calibrate recommendation scores, enforce medical eligibility rules, and provide local clinic referrals.

### 1. Challenge Datasets (Sourced from the DASSA Platform)
*   **Reversing the Stall in Fertility Decline — Western Kenya (APHRC / Challenge Dataset)**:
    *   *Usage*: Calibrated regional contraceptive preferences and weighted coefficients in the scoring algorithm based on historical usage rates and documented barriers.
*   **Unwanted Pregnancy in Nairobi Slums (APHRC / Challenge Dataset)**:
    *   *Usage*: Parameterized discontinuation rates and method-mix prevalence. Used to weight side-effect aversion and optimize nearest-clinic search radius calculations for peri-urban informal settlements.
*   **CHV Decision-Support App — Nairobi (Challenge Dataset)**:
    *   *Usage*: Structured Community Health Worker (CHW) referral flows and dashboard indicator logic, tracking consultation acceptance and escalation timelines.

### 2. Public and Externally Sourced Datasets Integrated
*   **WHO Medical Eligibility Criteria for Contraceptive Use (5th Edition, 2015/2016)**:
    *   *Usage*: The primary clinical reference dataset. It maps 63 medical conditions (e.g., hypertension, migraines with aura, lactation stages) across 8 contraceptive methods to eligibility categories 1–4.
*   **DHIS2 Facility Registry & GIS Coordinates (Kenya & Uganda Ministries of Health)**:
    *   *Usage*: Exposes facility names, districts, geographic coordinates (lat/lng), and service availability metrics to drive the nearest-clinic locator service.

---

## B. Data Management

### 1. Data Cleaning Procedures
*   **WHO MEC Text Sanitization**: The WHO MEC PDF source document was parsed, removing headers, page number markers, and non-printable ASCII characters. Complex table footnotes were programmatically associated with their corresponding cell entries to avoid context fragmentation.
*   **Geospatial Sanitization**: Facility coordinate data was filtered to eliminate null lat/lng records, coordinate inversion errors, and facilities located outside national borders. Missing service listings were populated with standard default tags.
*   **Input Deduplication**: To handle message retries from SMS and Meta's WhatsApp API, incoming messages are checked against a Redis-backed cache storing `message_id` hashes with a 5-minute Time-To-Live (TTL).

### 2. Feature Engineering Methods
*   **Semantic Text Chunking & Embeddings**: Ingested WHO MEC text was chunked using LangChain’s `RecursiveCharacterTextSplitter` set to a **512-token window** with a **64-token overlap** to maintain clinical sentence context. Vector embeddings were generated using the `all-MiniLM-L6-v2` transformer model and stored in a local ChromaDB instance.
*   **Profile Vectorization**: User responses gathered during USSD or chat intake are mapped to a simplified binary profile vector:
    *   `age` (mapped to discrete integer threshold flags)
    *   `breastfeeding` (boolean)
    *   `health_risk` (boolean, consolidated from high blood pressure, clots, and migraine flags)
    *   `preference` (mapped to `long_acting` or `daily` categories)
    *   `clinic_access` (boolean)
*   **Spatial Proximity Scoring**: Extracted user lat/lng inputs are queried against PostgreSQL using spatial Euclidean distance (`ST_DWithin` and `ST_Distance`) to identify and return the three nearest physical clinics.

### 3. Data Quality Checks
*   **Input Bounds Validation**: Frontend forms and backend endpoints utilize **Pydantic schemas** to enforce data limits (e.g., verifying age is between 10 and 55, and checking that health flag arrays only contain valid pre-defined strings).
*   **RAGAS Evaluation Framework**: The retrieval-augmented generation (RAG) pipeline is continuously audited against an **80-question golden evaluation set** stratified by condition and language. Evaluated metrics include:
    *   *Faithfulness* (ensuring no LLM hallucinations outside retrieved WHO MEC chunks)
    *   *Answer Relevancy* (matching user intent)
    *   *Context Precision* (relevancy of the top-k retrieved chunks)
*   **Deterministic Safety Regression**: Automated unit tests (`pytest`) run on every code build to verify that critical safety rules are 100% deterministic (e.g., validating that selecting "male" always eliminates all female-specific hormonal methods).

---

## C. Data Governance

### 1. Data Permissions and Licenses
*   **WHO MEC**: Utilized in accordance with the World Health Organization's **CC BY-NC-SA 3.0 IGO** license (Non-commercial, Attribution, Share-Alike).
*   **DASSA Challenge Datasets**: Used strictly for the innovation challenge under the DASSA challenge license terms. The raw microdata is kept entirely local, is not bundled within the codebase, and is **never** uploaded or redistributed to public repositories or LLM providers.
*   **DHIS2 / GIS Registries**: Public government data directories used in compliance with open government data access policies.

### 2. Privacy Protection Measures
*   **Bcrypt Hashing**: Phone numbers (`MSISDN`) extracted from WhatsApp and USSD webhooks are immediately hashed using **bcrypt** before any lookup or session mapping occurs, preventing plain-text phone numbers from being exposed in system logs.
*   **Ephemeral Session Caching**: User response profiles are cached temporarily in a **Redis store** with a strict **30-minute expiration TTL**. Once the consultation is complete or times out, the cache is completely purged.
*   **De-identified Encounters**: No personally identifiable information (PII) is written to the database. Persistent encounter logs are restricted to anonymous indicators (e.g., district, chosen language, recommended method) for aggregated public health dashboard metrics.

### 3. Compliance with Ethical Standards
*   **Adolescent Safeguards**: In accordance with the **WHO Adolescent Job Aid**, any intake indicating an age under 18 automatically injects supportive, non-stigmatizing safe-messaging constraints into the LLM system prompt.
*   **Clinical Boundaries & Disclaimers**: ContraBot is designed as a counseling support layer, not a prescribing tool. Every recommendation ends with a mandatory clinical disclaimer and direct guidance to consult a Community Health Worker (CHW) or clinic before starting any contraceptive method.
*   **Language Inclusivity**: Developed and reviewed translation scripts with native speakers across Kiswahili, Luganda, Somali, Amharic, and Sheng to prevent clinical semantic drift and ensure culturally appropriate framing.
