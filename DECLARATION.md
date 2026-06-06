# Intellectual Property and Open Science Declaration
Team: RKO
Submission: ContraBot — Multilingual AI Contraception Counselor
Challenge: AI for Reproductive Health in Africa Innovation Challenge
Date: July 2026

---

## 1. Ownership of Submitted Work

All code, prompts, system architecture, scoring algorithms, and 
documentation submitted as part of this project were created 
entirely by Team RKO during the hackathon period. No part of this 
submission was developed prior to the challenge or submitted to 
any other competition.

Team members:

### Ravine Riang'a (riangaravine@gmail.com)
*   Designed and implemented the ChromaDB vector store pipeline — chunking WHO MEC PDFs and APHRC briefs with LangChain (512-token windows, 64-token overlap) and embedding with all-MiniLM-L6-v2.
*   Built the RAG counseling engine: query routing, top-k cosine retrieval, prompt assembly with intake context, and Anthropic API integration for response generation with safe-messaging post-processing.
*   Developed the PostGIS nearest-clinic search module using ST_DWithin over the DHIS2 facility registry and OSRM walking-time estimation.
*   Authored the pytest end-to-end integration test suite — simulating full USSD sessions via Africa's Talking sandbox across all four supported languages.
*   Maintained PostgreSQL 15 schema (de-identified encounter tables, CHW consultation log, audit trail) and wrote the DHIS2 REST API nightly sync job.

### Vivianne Njoroge (viviannjoroge91@gmail.com)
*   **Data Science & Analytics**:
    *   Designed the weighted multi-criteria scoring model — formalised the Score(m) function, calibrated domain weights (efficacy, side-effects, cost, convenience, user preference) against WHO MEC evidence tables and East African cost surveys.
    *   Conducted RAGAS evaluation of the RAG pipeline — assembled the 80-question golden set stratified by language and condition category; measured faithfulness, answer relevancy, and context precision.
    *   Performed APHRC Nairobi HDSS data analysis — extracted clinic density, method-mix prevalence, and discontinuation rates to parameterise the scoring model and nearest-clinic search radius.
    *   Built the quarterly bias/fairness audit framework — automated RAGAS stratification reports surfacing performance gaps across language and demographic strata.
*   **Project Management**:
    *   Led end-to-end project coordination — maintained the team roadmap across three delivery phases (Pilot, Scale, Edge), tracked milestones in GitHub Projects, and ran weekly standups aligning technical and clinical workstreams.
    *   Managed stakeholder communication with APHRC, Amref Health Africa, and PATH collaborators — coordinated data-sharing agreements and open-source contributor onboarding for the Community Health Informatics governance model.
    *   Owned the submission deliverables checklist — ensured technical report, contributions summary, codebase documentation, and demo assets were completed on schedule and met all track requirements.
    *   Coordinated cross-functional dependency management between the data science scoring model, clinical validation cycle, and backend implementation — resolving blockers and re-prioritising sprint scope as needed.
    *   Prepared the grant pipeline documentation for the Gates Foundation Digital Health Accelerator and Wellcome Trust applications, synthesising technical and public health impact evidence.

### Francis Musau (francisfrancs02@gmail.com)
*   Led knowledge base ingestion and quality assurance — curated, cleaned, and version-controlled the WHO MEC, EngenderHealth, and APHRC source documents; authored chunk-diff detection tooling to flag knowledge base staleness.
*   Developed the aggregate analytics dashboard feeding de-identified encounter metrics to DHIS2 program indicators — including uptake trends, method distribution, and follow-up adherence rates.
*   Ran latency profiling and SLA validation — established p95 benchmarks (<2.5 s eligibility + scoring; <4.5 s full RAG) and implemented Prometheus metrics instrumentation across FastAPI endpoints.
*   Designed the infrastructure cost model — unit-economics analysis across USSD, SMS, WhatsApp, and Anthropic API channels, producing the USD 0.016/user/month estimate at 50,000 MAU.

### Evelyn (Clinical Lead)
*   Served as the team's WHO MEC clinical authority — validated the deterministic rule engine against the WHO MEC 5th Edition (2015, updated 2016) matrix, confirming correctness of all 63 condition × 8 method eligibility class assignments.
*   Authored the adolescent safe-messaging guidelines injected into the system prompt for users indicating age <18, aligning with WHO Adolescent Job Aid recommendations.
*   Led back-translation quality assurance for all four language variants (Kiswahili, Luganda, Somali, Amharic) — reviewed counseling scripts with native speaker collaborators to prevent semantic drift in clinical terminology.
*   Defined the clinical disclaimer and referral protocol — mandatory end-of-session messaging directing users to a licensed provider before initiating a contraceptive method.
*   Provided side-effect triage guidance for the continuous-support follow-up module — authored decision trees for common IUD, implant, and oral contraceptive side effects to reduce unnecessary discontinuation.
*   Ensured alignment with Kenya, Uganda, and Tanzania regulatory frameworks — reviewed reproductive health service delivery guidelines and advised on scope-of-practice boundaries for the AI counseling layer.

### Blessings Wanjiku (blessingswanjiku15@gmail.com)
*   Led user research and persona development — conducted contextual interviews with women of reproductive age and CHWs across Nairobi peri-urban settlements to define primary personas and surface key pain points in existing counseling workflows.
*   Designed the USSD conversation architecture — structured the 5-question intake flow, language-selection screen, and follow-up opt-in dialogue to minimise session length while maintaining clinical completeness; validated against GSMA USSD UX guidelines.
*   Created Progressive Web App wireframes and high-fidelity mockups for the CHW dashboard and Transport Manager reporting view — designed in Figma with a WCAG 2.1 AA-compliant colour system and accessible typography scale.
*   Authored the localisation style guide — defined tone-of-voice, reading-level targets (Flesch-Kincaid Grade 6 equivalent), and culturally appropriate metaphors for Kiswahili, Luganda, Somali, and Amharic interfaces.
*   Facilitated usability testing sessions — ran think-aloud protocols with 12 participants across two iteration cycles; distilled findings into a prioritised UX bug backlog and design system updates.
*   Designed the follow-up nudge message templates for SMS and WhatsApp — crafted concise, empathetic copy for 1-week and 1-month check-ins that avoids stigmatising language and respects user privacy.

### Faruoq Muhammed (farouqmuhammed@gmail.com)
*   Architected and implemented the FastAPI backend including all REST endpoints: /counsel, /eligibility, /clinic, /ussd, and /log.
*   Built the WHO MEC deterministic rule engine in pure Python — mapping 63 medical conditions across 8 contraceptive categories to eligibility classes 1–4 with 100% regression test coverage.
*   Integrated Africa's Talking USSD/SMS API and designed the Redis-backed finite state machine handling multi-turn USSD dialogue with session reconnect tolerance.
*   Led Docker Compose and Kubernetes (GKE) deployment configuration; authored CI/CD pipeline via GitHub Actions with automated pytest and RAGAS evaluation gates.
*   Implemented bcrypt MSISDN hashing, AES-256 Redis encryption at rest, and TLS 1.3 enforcement across all API surfaces.


---

## 2. Open-Source Components Used

| Component | License | How we use it |
|---|---|---|
| FastAPI | MIT | Backend API framework |
| ChromaDB | Apache 2.0 | Vector store for WHO MEC RAG |
| Claude API (Anthropic) | Commercial API | LLM recommendation engine |
| Africa's Talking API | Commercial API | USSD channel integration |
| Meta NLLB-200 | CC-BY-NC-4.0 | Multilingual translation layer |
| React | MIT | Web chat and CHW dashboard frontend |
| Tailwind CSS | MIT | Frontend styling |
| Recharts | MIT | Analytics charts |
| Three.js | MIT | 3D doctor avatar rendering |
| LangDetect | Apache 2.0 | Language auto-detection |

All open-source components are used in accordance with their 
respective licenses. No proprietary or closed-source components 
are bundled in the submitted codebase.

---

## 3. Dataset Compliance

| Dataset | Source | License | How we use it |
|---|---|---|---|
| WHO Medical Eligibility Criteria for Contraceptive Use | World Health Organization | CC BY-NC-SA 3.0 IGO | Primary knowledge base for RAG pipeline and safety screening rules |
| Reversing the Stall in Fertility Decline — Western Kenya | APHRC / Challenge Dataset | Challenge dataset license | Regional method preference calibration |
| Unwanted Pregnancy in Nairobi Slums | APHRC / Challenge Dataset | Challenge dataset license | User profile calibration and barrier analysis |
| CHV Decision-Support App — Nairobi | APHRC / Challenge Dataset | Challenge dataset license | CHW dashboard logic and referral flow |

All datasets are used strictly for the purposes of model training, 
knowledge base construction, and evaluation within this challenge. 
No dataset is redistributed or published beyond what is required 
for reproducibility review.

---

## 4. Showcase Permission

Team RKO grants the challenge organizers (MSRH / Data Science Africa 
/ APHRC) full permission to:

- Showcase the ContraBot prototype at conferences, workshops, 
  and educational events
- Reference the project in publications and dissemination materials
- Use screenshots, demo recordings, and project descriptions for 
  educational purposes

This permission is granted for non-commercial educational and 
dissemination purposes only. Commercial use requires separate 
written agreement with Team RKO.

---

## 5. Open Science Commitment

In the spirit of open science, Team RKO commits to:

- Publishing the full codebase under MIT License on GitHub 
  at: https://github.com/teamrko/contrabot
- Publishing the WHO MEC ChromaDB embeddings and ingestion 
  scripts under CC BY 4.0
- Making the reproducibility package (notebooks, sample data, 
  evaluation scripts) publicly available
- Responding to reasonable requests from researchers seeking 
  to build on this work

---

*Signed on behalf of Team RKO*
*Blessings Wanjiku*
*July 2026*
