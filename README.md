# ⚖️ LexiFlow AI

**Agentic Legal Contract Review & Risk Mitigation Platform**

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?logo=mongodb)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=github-actions)

LexiFlow AI is an enterprise-grade, full-stack platform designed to automate the auditing of commercial contracts (MSAs, NDAs, Government Procurement). By combining **Zero-Trust Data Privacy**, an **Adversarial LangGraph AI Workflow**, and a **Self-Cleaning Vector CI/CD Pipeline**, LexiFlow reduces contract review turnaround from hours to seconds while preventing data leakage and generative hallucinations.

---

## ✨ Core Features

*   **🛡️ Zero-Trust PII Shield:** A localized sanitization layer utilizing Microsoft Presidio, a 12MB `spaCy` (`en_core_web_sm`) model, and custom deterministic regex. Reversibly tokenizes sensitive corporate entities, names, and addresses *before* any data reaches cloud LLMs.
*   **🤖 Adversarial AI State Machine:** Powered by **LangGraph** and the **Groq LPU Engine**, the system utilizes a dual-agent loop. A *Prosecutor Agent* hunts for one-sided risks, while a *Defender Agent* drafts neutral, playbook-compliant redlines.
*   **🔄 Automated Legal Data Pipeline (CI/CD):** A serverless GitHub Actions cron job triggers monthly to scrape live amendments for the Indian Contract Act and DPDP Act directly from the Wikipedia REST API.
*   **🧹 Self-Cleaning Vector DB:** The ingestion pipeline utilizes a strict "Wipe-and-Replace" (`delete_many`) safeguard in MongoDB Atlas to purge stale RAG vectors before inserting new ones, ensuring zero database bloat and zero hallucinations.
*   **⚡ Real-Time Streaming UX:** Fast, asynchronous processing via FastAPI **Server-Sent Events (SSE)**. The React frontend features persistent state mapping via a custom `useSessionStorage` hook, preventing data loss on browser refreshes.
*   **📄 Executive Export:** One-click `.doc` report generation and native clipboard tools to streamline external negotiation emails.

---

## 🏗️ System Architecture & Tech Stack

**Frontend:**
*   React 18 (TypeScript) + Vite
*   Tailwind CSS & Framer Motion

**Backend & Agentic Engine:**
*   FastAPI (ASGI) + Uvicorn
*   LangGraph (Stateful Agentic Loops)
*   Groq API (Llama-3-70B / Ultra-low latency inference)
*   Microsoft Presidio + spaCy (NLP Anonymization)

**Database & DevOps:**
*   MongoDB Atlas (Document Storage + Vector Search)
*   GitHub Actions (Automated cron ingestion)
*   Vercel (Edge CDN Frontend) + Render (Python Web Service)

---

## 👥 Team
**Developed as a Final Year Data Science Capstone Project (B.K. Birla College, Kalyan)**
*   **Sagar Santosh Yadav:** Backend Engine, AI Agents, PII Guardrails, Cloud DevOps & CI/CD.
*   **Gouri Nilesh Dhumak:** Frontend UI/UX, Contract Parsing, Redline Diff, Edge CI/CD.

## 📄 License
This project is licensed under the MIT License.
