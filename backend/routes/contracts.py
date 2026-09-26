from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
import json
from typing import List, Optional
from bson import ObjectId
from database import contracts_collection, clauses_collection
from utils.pii_masker import mask_pii, unmask_pii
from agent_graph import agent_graph, ClauseReviewState, llm
from pydantic import BaseModel
import io
import docx

router = APIRouter()

def mock_extract_text(file: UploadFile) -> str:
    """
    Mock function to extract text from .pdf or .docx files.
    In Phase 2, implement actual text extraction here.
    """
    return (
        "This is a sample contract between SpaceX and John Doe.\n\n"
        "John Doe agrees to pay $10,000 to SpaceX on 2026-10-01.\n\n"
        "Contact email is john.doe@example.com and phone number is 555-1234."
    )

@router.post("/upload")
async def upload_contract(file: UploadFile = File(...)):
    try:
        if not (file.filename.endswith(".pdf") or file.filename.endswith(".docx")):
            raise HTTPException(status_code=400, detail="Only .pdf and .docx files are supported")
        
        # 1. Extract text
        if file.filename.endswith(".docx"):
            import docx
            import io
            import re
            content = await file.read()
            doc = docx.Document(io.BytesIO(content))
            
            def is_noise(text):
                if re.search(r'<[A-Z_]+_\d+>', text):
                    return False
                if re.match(r'^(\d+|_+)$', text):
                    return True
                if re.match(r'^(By|Title|Date):.*', text, re.IGNORECASE):
                    return True
                return False

            raw_paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip() and not is_noise(p.text.strip())]
            full_text_to_mask = "\n".join(raw_paragraphs)
        else:
            full_text_to_mask = mock_extract_text(file)
            
        if not full_text_to_mask.strip():
            raise HTTPException(status_code=400, detail="No readable text found in document")
            
        # 2. Split into clauses FIRST
        import re
        clause_splits_raw = re.split(
            r'(?:^|\n|(?<=[\.\!\?])\s+)(?=(?:\d+[\.\)]\s+[A-Z]|SECTION\s+\d+|ARTICLE\s+[IVXLCDM\d]+))',
            full_text_to_mask
        )
        clause_splits_raw = [c.strip() for c in clause_splits_raw if c.strip()]
        if len(clause_splits_raw) > 1 and not re.match(r'^(?:\d+[\.\)]\s+[A-Z]|SECTION\s+\d+|ARTICLE\s+[IVXLCDM\d]+)', clause_splits_raw[0]):
            clause_splits_raw[1] = clause_splits_raw[0] + "\n\n" + clause_splits_raw[1]
            clause_splits_raw = clause_splits_raw[1:]
            
        # 3. Mask PII on each individual clause and combine
        clause_splits = []
        document_mapping = {}
        for c in clause_splits_raw:
            masked_c, mapping = mask_pii(c)
            clause_splits.append(masked_c)
            document_mapping.update(mapping)
            
        full_masked_text = "\n\n".join(clause_splits)
        
        # 4. Save contract metadata to get a contract_id
        contract_doc = {
            "filename": file.filename,
            "status": "processed",
            "pii_mapping": document_mapping,
            "raw_text": full_masked_text
        }
        result = await contracts_collection.insert_one(contract_doc)
        contract_id = result.inserted_id
        
        # 5. Save the chunks as clauses
        clauses_to_insert = []
        response_clauses = []
        for index, masked_para in enumerate(clause_splits):
            clause_doc = {
                "contract_id": contract_id,
                "clause_index": index,
                "original_text": masked_para,
                "masked_text": masked_para,
                "risk_score": 0,
                "status": "pending",
                "prosecutor_flags": [],
                "playbook_rules": [],
                "amended_text": ""
            }
            clauses_to_insert.append(clause_doc)
            
        if clauses_to_insert:
            insert_result = await clauses_collection.insert_many(clauses_to_insert)
            for idx, cid in enumerate(insert_result.inserted_ids):
                c = clauses_to_insert[idx]
                response_clauses.append({
                    "clause_id": str(cid),
                    "original_text": c["original_text"],
                    "masked_text": c["masked_text"],
                    "risk_score": c["risk_score"],
                    "status": c["status"],
                    "prosecutor_flags": c["prosecutor_flags"],
                    "playbook_rules": c["playbook_rules"],
                    "amended_text": c["amended_text"],
                    "iteration_count": 0
                })
            
        return {
            "message": "Contract uploaded successfully",
            "contract_id": str(contract_id),
            "clauses_count": len(clauses_to_insert),
            "clauses": response_clauses
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{contract_id}/stream")
async def stream_contract_review(contract_id: str):
    async def event_generator():
        cursor = clauses_collection.find({"contract_id": ObjectId(contract_id)}).sort("clause_index", 1)
        clauses = await cursor.to_list(length=None)
        
        from agent_graph import analyze_clause
        
        for idx, item in enumerate(clauses):
            clause_text = item.get("original_text", "") if isinstance(item, dict) else str(item)
            clause_id_str = str(item.get("_id", idx)) if isinstance(item, dict) else str(idx)
            
            try:
                analysis = await analyze_clause(clause_text)
                
                payload = {
                    "clause_index": idx,
                    "clause_id": clause_id_str,
                    "original_text": clause_text,
                    "risk_score": analysis["risk_score"],
                    "risk_analysis": analysis["risk_analysis"],
                    "violations": analysis["violations"],
                    "amended_text": analysis["amended_text"],
                    "status": "completed"
                }
                
                yield f"data: {json.dumps(payload)}\n\n"
                
                await clauses_collection.update_one(
                    {"_id": item["_id"]}, 
                    {"$set": {
                        "risk_score": analysis["risk_score"],
                        "prosecutor_flags": analysis["risk_analysis"],
                        "playbook_rules": analysis["violations"],
                        "amended_text": analysis["amended_text"],
                        "status": "completed"
                    }}
                )
            except Exception as e:
                import traceback
                traceback.print_exc()
                yield f"data: {json.dumps({'event': 'clause_error', 'clause_id': clause_id_str, 'error': str(e)})}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

class ChatRequest(BaseModel):
    message: str

class EmailRequest(BaseModel):
    clauses: Optional[List[dict]] = None

@router.post("/{contract_id}/chat")
async def chat_with_contract(contract_id: str, request: ChatRequest):
    try:
        contract_oid = ObjectId(contract_id)
        contract = await contracts_collection.find_one({"_id": contract_oid})
        if not contract:
            raise HTTPException(status_code=404, detail="Contract not found")
            
        chat_history = contract.get("chat_history", [])
        history_text = "\n".join([f"{msg['role'].capitalize()}: {msg['content']}" for msg in chat_history])

        cursor = clauses_collection.find({"contract_id": contract_oid}).sort("clause_index", 1)
        clauses = await cursor.to_list(length=None)
        
        full_text = "\n\n".join([clause.get("masked_text", clause.get("original_text", "")) for clause in clauses])
        full_text, _ = mask_pii(full_text)
        
        user_message_masked, _ = mask_pii(request.message)
        
        prompt = f"""
You are a Senior Corporate Legal Counsel and Legal Advisor.
You have two distinct operational modes:
1. CONTRACT-SPECIFIC MODE: When asked about the uploaded document, reference specific clauses, audit findings, and risk scores. Explain rights and liabilities clearly.
2. GENERAL LAW & REAL-WORLD ADVISORY MODE: If the user asks about any law, legal doctrine, statutory rule, compliance standard, or hypothetical scenario—even if completely unrelated to the contract—you MUST answer thoroughly and authoritatively in plain English for a non-lawyer.
MANDATORY REQUIREMENT FOR ALL LEGAL EXPLANATIONS:
Whenever you explain a legal rule, doctrine, or clause type, you MUST conclude with a concrete 'Real-World Scenario' header. In this scenario, walk through a realistic story (e.g., 'Imagine Company A contracts Developer B...') illustrating exactly how this rule is applied, contested, or enforced in practice.
CRITICAL FORMATTING RULE: Do NOT generate Markdown tables under any circumstances. You must format all comparisons, features, or structured data using vertical bulleted lists.

Contract Text:
{full_text}

Conversation History:
{history_text}

User Question: {user_message_masked}
"""
        response = await llm.ainvoke(prompt)
        
        new_messages = [
            {"role": "user", "content": user_message_masked},
            {"role": "model", "content": response.content}
        ]
        
        await contracts_collection.update_one(
            {"_id": contract_oid},
            {"$push": {"chat_history": {"$each": new_messages}}}
        )
        
        return {"reply": response.content}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"reply": f"An error occurred during chat: {str(e)}"}

@router.post("/{contract_id}/generate-email")
async def generate_pushback_email(contract_id: str, request: EmailRequest = None):
    try:
        if request and request.clauses is not None:
            flagged_clauses = [
                c for c in request.clauses
                if c.get("risk_score", 0) >= 7 or c.get("amended_text", "") != ""
            ]
        else:
            cursor = clauses_collection.find({
                "contract_id": ObjectId(contract_id),
                "$or": [
                    {"risk_score": {"$gt": 0}},
                    {"amended_text": {"$exists": True, "$ne": ""}}
                ]
            }).sort("clause_index", 1)
            
            flagged_clauses = await cursor.to_list(length=None)
        
        if not flagged_clauses:
            return {"email": "No high-risk clauses found. The contract looks good to sign!"}
            
        clauses_summary = ""
        for clause in flagged_clauses:
            clause_text, _ = mask_pii(clause.get("masked_text", clause.get("original_text", "")))
            amended_text, _ = mask_pii(clause.get('amended_text', ''))
            clauses_summary += f"- Original: {clause_text}\n"
            clauses_summary += f"  Amended: {amended_text}\n\n"
            
        prompt = f"""
Draft a professional, polite, but firm pushback email to the counterparty.
We have reviewed the contract and need to propose the following amendments to resolve identified risks:

{clauses_summary}

Keep the email concise and suitable for corporate communication.
"""
        response = llm.invoke(prompt)
        email_draft = response.content
        await contracts_collection.update_one(
            {"_id": ObjectId(contract_id)},
            {"$set": {"pushback_email": email_draft}}
        )
        return {"email": email_draft}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"email": f"An error occurred while generating the email: {str(e)}"}

@router.get("/{contract_id}/export/report")
async def export_audit_report(contract_id: str):
    contract_oid = ObjectId(contract_id)
    contract = await contracts_collection.find_one({"_id": contract_oid})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    cursor = clauses_collection.find({"contract_id": contract_oid}).sort("clause_index", 1)
    clauses = await cursor.to_list(length=None)
    
    doc = docx.Document()
    doc.add_heading('Audit Report', 0)
    doc.add_paragraph(f"Contract: {contract.get('filename', 'Unknown')}")
    
    for clause in clauses:
        doc.add_heading(f"Clause {clause.get('clause_index', 0) + 1}", level=1)
        doc.add_paragraph(f"Original Text: {clause.get('original_text', '')}")
        doc.add_paragraph(f"Risk Score: {clause.get('risk_score', 0)}")
        if clause.get("prosecutor_flags"):
            doc.add_paragraph("Flags: " + ", ".join(clause.get("prosecutor_flags", [])))
        if clause.get("amended_text"):
            doc.add_paragraph(f"Amended Text: {clause.get('amended_text', '')}")
            
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        headers={"Content-Disposition": "attachment; filename=Audit_Report.docx"}
    )

@router.get("/{contract_id}/export/email")
async def export_pushback_email(contract_id: str):
    contract_oid = ObjectId(contract_id)
    contract = await contracts_collection.find_one({"_id": contract_oid})
    if not contract or "pushback_email" not in contract:
        raise HTTPException(status_code=404, detail="Email not found")
        
    doc = docx.Document()
    doc.add_heading('Pushback Email', 0)
    doc.add_paragraph(contract["pushback_email"])
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        headers={"Content-Disposition": "attachment; filename=Pushback_Email.docx"}
    )
