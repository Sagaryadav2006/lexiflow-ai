import os
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

load_dotenv()

try:
    from schemas.builder import ContractGenerationRequest
except ImportError:
    from backend.schemas.builder import ContractGenerationRequest

builder_router = APIRouter(tags=["Contract Builder"])
router = builder_router

prompt_template = PromptTemplate(
    input_variables=[
        "agreement_type", "jurisdiction", "primary_party", "counter_party", 
        "posture", "special_provisions", "full_contract_context", 
        "current_clause", "user_query"
    ],
    template=(
        "You are Lexi-Copilot, an elite corporate attorney and bilingual legal translator. "
        "Depending on the inputs provided, you have two jobs: \n"
        "1. DRAFTING: If instructed to draft an agreement, generate a {agreement_type} under the jurisdiction of {jurisdiction}. "
        "Party A is {primary_party} and Party B is {counter_party}. Heavily favor {posture} and include: {special_provisions}. "
        "Output clean, professional text without markdown tables.\n\n"
        
        "2. COPILOT ANALYSIS: If the user provides a query about an existing clause, you must evaluate it holistically. \n"
        "GLOBAL CONTRACT CONTEXT: {full_contract_context}\n"
        "CURRENT CLAUSE FOCUS: {current_clause}\n"
        "USER QUERY: {user_query}\n\n"
        
        "ANALYSIS RULES:\n"
        "- OVERALL CONTEXT: Always evaluate the CURRENT CLAUSE against the GLOBAL CONTRACT CONTEXT to find hidden traps or contradictions.\n"
        "- PLAIN ENGLISH: Explain complex risks as if talking to a smart business owner. Avoid heavy legalese.\n"
        "- RIGHTS VIOLATIONS: Explicitly highlight if the clause suppresses basic rights for individuals (e.g., privacy, right to work) or organizations (e.g., IP theft, unlimited liability).\n"
        
        "Answer:"
    )
)

@builder_router.post("/generate")
async def generate_contract(request: ContractGenerationRequest):
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_API_KEY is not configured in the environment."
        )

    try:
        formatted_prompt = prompt_template.format(
            agreement_type=request.agreement_type or "N/A",
            jurisdiction=request.jurisdiction or "N/A",
            primary_party=request.primary_party or "N/A",
            counter_party=request.counter_party or "N/A",
            posture=request.posture or "N/A",
            special_provisions=request.special_provisions or "None",
            full_contract_context=request.full_contract_context or "No global context provided.",
            current_clause=request.current_clause or "No specific clause provided.",
            user_query=request.user_query or "Draft the contract."
        )

        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                temperature=0.2,
                google_api_key=api_key 
            )
            response = await llm.ainvoke(formatted_prompt)
        except Exception as gemini_err:
            if "404" in str(gemini_err) or "not found" in str(gemini_err).lower():
                llm = ChatGoogleGenerativeAI(
                    model="gemini-3.8-flash",
                    temperature=0.2,
                    google_api_key=api_key
                )
                response = await llm.ainvoke(formatted_prompt)
            else:
                raise gemini_err

        if hasattr(response, "content"):
            content = response.content
            if isinstance(content, str):
                drafted_contract = content
            elif isinstance(content, list):
                text_parts = []
                for item in content:
                    if isinstance(item, dict) and "text" in item:
                        text_parts.append(str(item["text"]))
                    elif isinstance(item, str):
                        text_parts.append(item)
                    else:
                        text_parts.append(str(item))
                drafted_contract = "".join(text_parts)
            else:
                drafted_contract = str(content)
        else:
            drafted_contract = str(response)

        return {"drafted_contract": drafted_contract}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Contract generation failed: {str(e)}"
        )
