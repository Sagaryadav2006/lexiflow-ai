⚖️ LexiFlow AI

An Agentic Legal Contract Review & Risk Mitigation Platform

LexiFlow AI is an enterprise-grade, full-stack application designed to automate the auditing of complex legal agreements, ranging from standard vendor MSAs to multi-page government contracts. By leveraging an agentic AI workflow combined with deterministic legal guardrails, the platform rapidly ingests documents, isolates predatory clauses, and generates playbook-compliant redline amendments in real time.

🚀 Live Demo

Frontend (Vercel): lexiflow-ai-sagar.vercel.app (Replace with your actual Vercel link)

Backend API (Render): Cloud-hosted FastAPI service with Server-Sent Events (SSE).

(Note: The backend is hosted on a free cloud tier and may take 30-50 seconds to spin up upon the first upload if it has been inactive).

✨ Core Features

🛡️ Zero-Trust PII Shielding: Integrates Microsoft Presidio, a lightweight spaCy NLP model (en_core_web_sm), and custom deterministic regex. Sensitive entities (names, addresses, organizations) are masked before leaving the server, ensuring strict data privacy compliance during LLM processing.

⚖️ Dual-Agent Risk Engine (LangGraph): Utilizes a sophisticated "Prosecutor/Defender" architecture powered by the Groq API (GPT-OSS-20b). The Prosecutor node audits isolated clauses for liabilities, while the Defender node drafts clean, natural-language redline amendments to cure identified risks.

🚦 Deterministic Legal Guardrails: Bypasses LLM hallucination using a hardcoded Python risk-routing engine. It instantly flags universal commercial hazards—such as uncapped one-way indemnification, predatory 25-year non-competes, and asymmetric termination rights—ensuring 100% accuracy on critical financial risks.

⚡ Asynchronous SSE Streaming: A multi-processed FastAPI backend splits complex .pdf and .docx files into clean structural nodes and streams the AI analysis back to the client via Server-Sent Events (SSE), eliminating API timeout failures on 20+ page documents.

📊 Executive Legal Health Suite: A highly interactive React/TypeScript frontend featuring a real-time clause navigation slider, an aggregate financial exposure dashboard, an automated pushback-email generator, and a conversational AI chat assistant for contract queries.

🏗️ System Architecture

Ingestion & Parsing: Multi-engine parsing (pypdf, fitz, python-docx) extracts text and normalizes layout artifacts, splitting the document into strictly isolated clauses.

Anonymization: Presidio and RegEx mask PII into tokens (e.g., <COMPANY_1>, <MONEY_1>).

Guardrail Routing: The system checks clauses against hardcoded deterministic legal rules. If a known severe risk is found, it fast-paths the redline.

Agentic Audit (LangGraph): Novel clauses are passed to the Groq-powered LangGraph pipeline. The Prosecutor grades the risk (0-10); if risky (>=4), the Defender iteratively drafts amendments.

Real-time Streaming: Results are streamed to the React UI via SSE, updating the clause slider and risk metrics dynamically.

Deanonymization & Export: Redlined text is deanonymized securely and can be exported as a Word Document (.docx) audit report or pushback email.

💻 Tech Stack

Frontend

Framework: React, Vite, TypeScript

Styling & UI: Tailwind CSS, Framer Motion, Radix UI (shadcn-inspired), Lucide Icons

Hosting: Vercel (Edge CDN)

Backend

Framework: Python, FastAPI, Uvicorn

AI & NLP: LangGraph, LangChain, Groq API, Microsoft Presidio, spaCy (en_core_web_sm)

Document Processing: pypdf, PyMuPDF (fitz), python-docx

Database: MongoDB Atlas (accessed via motor async driver)

Hosting: Render (Web Service)

🛠️ Local Installation & Setup

Prerequisites

Python 3.10+

Node.js 18+

MongoDB Atlas Cluster

Groq API Key

📝 License

This project is MIT licensed.

Built with ❤️ by Sagar and Gouri
