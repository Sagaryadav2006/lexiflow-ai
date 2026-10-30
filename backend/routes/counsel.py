import os
from typing import List
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate

load_dotenv()

try:
    from schemas.counsel import CounselChatRequest, CounselChatResponse
except ImportError:
    from backend.schemas.counsel import CounselChatRequest, CounselChatResponse

try:
    from database import client
except ImportError:
    from backend.database import client

counsel_router = APIRouter(tags=["Lexi-Counsel"])
router = counsel_router

# 1. Initialize Google Generative AI embeddings (lightweight cloud API, resolves RAM OOM)
embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")

# 2. Synchronous MongoDB Collection for Atlas Vector Search
sync_client = getattr(client, "delegate", client)
db_name = os.getenv("MONGO_DB_NAME", "lexiflow")
legal_nodes_collection = sync_client[db_name]["legal_nodes"]

# 3. Vector Store Initialization
vector_store = MongoDBAtlasVectorSearch(
    collection=legal_nodes_collection,
    embedding=embeddings,
    index_name="vector_index"
)

# Hardcoded 5 detailed seed text chunks from DPDP Act 2023 & Indian Contract Act 1872
SEED_LEGAL_DATA = [
    {
        "content": (
            "Under Section 6 of the Digital Personal Data Protection Act 2023 (DPDP Act), personal data may only be "
            "processed for a lawful purpose for which the Data Principal has given explicit, free, specific, informed, "
            "unconditional, and unambiguous consent accompanied by a clear notice in English or any 8th Schedule language. "
            "Any consent obtained through coercion, deception, or bundling is void ab initio."
        ),
        "source": "DPDP Act 2023 §6 (Consent & Notice Requirements)",
        "title": "DPDP Act 2023 - Explicit Consent"
    },
    {
        "content": (
            "Section 16 of the DPDP Act 2023 allows cross-border transfer of personal data for processing, except to "
            "countries explicitly blacklisted or restricted by the Central Government via notification. However, higher "
            "sector-specific localization mandates (such as RBI payment data storage directives and IRDAI insurance mandates) "
            "supersede and require primary financial/sensitive copies to be retained within India."
        ),
        "source": "DPDP Act 2023 §16 (Cross-Border Data Transfers & Localization)",
        "title": "DPDP Act 2023 - Data Localization & Transfers"
    },
    {
        "content": (
            "The DPDP Act 2023 imposes stringent fiduciary accountability under Section 8, requiring Data Fiduciaries to "
            "implement reasonable security safeguards to prevent personal data breaches. Under the Schedule and Section 33, "
            "failure to take reasonable security safeguards to prevent data breaches incurs statutory monetary penalties "
            "up to ₹250 Crore (INR 2.5 Billion) imposed by the Data Protection Board of India."
        ),
        "source": "DPDP Act 2023 §33 & Schedule (Security Safeguards & Penalties up to ₹250 Crore)",
        "title": "DPDP Act 2023 - Penalties up to ₹250 Crore"
    },
    {
        "content": (
            "Section 74 of the Indian Contract Act, 1872 stipulates that when a contract has been broken, if a sum is named "
            "in the contract as the amount to be paid in case of such breach, or if the contract contains any other stipulation "
            "by way of penalty, the party complaining of the breach is entitled, whether or not actual damage or loss is "
            "proved to have been caused thereby, to receive from the party who has broken the contract reasonable compensation "
            "not exceeding the amount so named. Under Supreme Court precedent (Kailash Nath Associates v. DDA), compensation is "
            "awarded only if genuine damage occurs and cannot be punitive."
        ),
        "source": "Indian Contract Act 1872 §74 (Liquidated Damages & Penalties)",
        "title": "Indian Contract Act - Section 74 Liquidated Damages"
    },
    {
        "content": (
            "Section 27 of the Indian Contract Act, 1872 establishes that every agreement by which anyone is restrained from "
            "exercising a lawful profession, trade, or business of any kind is to that extent void. The Supreme Court of India "
            "(Niranjan Shankar Golikari, Percept D'Mark) has established that post-termination non-compete covenants are void "
            "ab initio and contrary to public policy under Section 27, with no reasonableness or geographical exception permitted."
        ),
        "source": "Indian Contract Act 1872 §27 (Agreements in Restraint of Trade Void)",
        "title": "Indian Contract Act - Section 27 Non-Compete"
    }
]

prompt_template = PromptTemplate(
    input_variables=["context", "question"],
    template=(
        "You are Lexi-Counsel, an elite Indian legal AI. Answer the user's question based strictly on the provided context. "
        "If the answer is not in the context, say you cannot provide legal advice on that topic. Context: {context}\n\n"
        "Question: {question}\n\n"
        "Answer:"
    )
)

@counsel_router.post("/seed")
async def seed_legal_nodes():
    try:
        documents = [
            Document(
                page_content=item["content"],
                metadata={"source": item["source"], "title": item["title"]}
            )
            for item in SEED_LEGAL_DATA
        ]

        try:
            MongoDBAtlasVectorSearch.from_documents(
                documents=documents,
                embedding=embeddings,
                collection=legal_nodes_collection,
                index_name="vector_index"
            )
        except Exception as seed_err:
            if "404" in str(seed_err) or "not found" in str(seed_err).lower():
                fallback_embeddings = GoogleGenerativeAIEmbeddings(
                    model="models/gemini-embedding-001",
                    output_dimensionality=768
                )
                MongoDBAtlasVectorSearch.from_documents(
                    documents=documents,
                    embedding=fallback_embeddings,
                    collection=legal_nodes_collection,
                    index_name="vector_index"
                )
            else:
                raise seed_err

        return {
            "message": "Successfully seeded 5 legal knowledge nodes into MongoDBAtlasVectorSearch.",
            "count": len(documents)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to seed vector store: {str(e)}"
        )

@counsel_router.post("/chat", response_model=CounselChatResponse)
async def chat_counsel(request: CounselChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured in the environment."
        )

    retrieved_docs: List[Document] = []
    sources: List[str] = []

    # 1. Attempt similarity search on vector store
    try:
        try:
            retrieved_docs = vector_store.similarity_search(request.query, k=3)
        except Exception as search_err:
            if "404" in str(search_err) or "not found" in str(search_err).lower():
                fallback_store = MongoDBAtlasVectorSearch(
                    collection=legal_nodes_collection,
                    embedding=GoogleGenerativeAIEmbeddings(
                        model="models/gemini-embedding-001",
                        output_dimensionality=768
                    ),
                    index_name="vector_index"
                )
                retrieved_docs = fallback_store.similarity_search(request.query, k=3)
            else:
                raise search_err
    except Exception as search_err:
        print(f"[Lexi-Counsel] Vector search fallback triggered: {search_err}")

    # Fallback to local seed chunks if vector search returned nothing or index is unavailable
    if not retrieved_docs:
        query_lower = request.query.lower()
        matched = []
        for item in SEED_LEGAL_DATA:
            words = [w for w in query_lower.split() if len(w) > 3]
            score = sum(1 for w in words if w in item["content"].lower())
            matched.append((score, item))
        matched.sort(key=lambda x: x[0], reverse=True)
        retrieved_docs = [
            Document(page_content=m[1]["content"], metadata={"source": m[1]["source"], "title": m[1]["title"]})
            for m in matched[:3] if m[0] > 0
        ] or [
            Document(page_content=SEED_LEGAL_DATA[0]["content"], metadata={"source": SEED_LEGAL_DATA[0]["source"], "title": SEED_LEGAL_DATA[0]["title"]})
        ]

    context_parts = []
    for doc in retrieved_docs:
        context_parts.append(doc.page_content)
        source_name = doc.metadata.get("source") or doc.metadata.get("title") or "Indian Legal Statutes"
        if source_name not in sources:
            sources.append(source_name)

    context_str = "\n\n".join(context_parts)
    formatted_prompt = prompt_template.format(context=context_str, question=request.query)

    # 2. Query Gemini LLM with system prompt
    try:
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=api_key,
                temperature=0.2,
                max_retries=1
            )
            response = await llm.ainvoke(formatted_prompt)
        except Exception as gemini_err:
            if "404" in str(gemini_err) or "not found" in str(gemini_err).lower():
                llm = ChatGoogleGenerativeAI(
                    model="gemini-3.8-flash",
                    google_api_key=api_key,
                    temperature=0.2
                )
                response = await llm.ainvoke(formatted_prompt)
            else:
                raise gemini_err

        if hasattr(response, "content"):
            content = response.content
            if isinstance(content, str):
                answer = content
            elif isinstance(content, list):
                text_parts = []
                for item in content:
                    if isinstance(item, dict) and "text" in item:
                        text_parts.append(str(item["text"]))
                    elif isinstance(item, str):
                        text_parts.append(item)
                    else:
                        text_parts.append(str(item))
                answer = "".join(text_parts)
            else:
                answer = str(content)
        else:
            answer = str(response)

        return CounselChatResponse(answer=answer, sources=sources)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Counsel generation failed: {str(e)}"
        )
