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
        "agreement_type",
        "jurisdiction",
        "primary_party",
        "counter_party",
        "posture",
        "special_provisions"
    ],
    template=(
        "You are an elite corporate attorney drafting a {agreement_type} under the jurisdiction of {jurisdiction}. "
        "Party A is {primary_party} and Party B is {counter_party}. "
        "The drafting posture must heavily favor {posture}. "
        "Incorporate these special provisions: {special_provisions}. "
        "Output the contract in clean, professional text format without markdown tables."
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
            agreement_type=request.agreement_type,
            jurisdiction=request.jurisdiction,
            primary_party=request.primary_party,
            counter_party=request.counter_party,
            posture=request.posture,
            special_provisions=request.special_provisions
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
