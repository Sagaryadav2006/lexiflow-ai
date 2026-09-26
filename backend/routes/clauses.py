from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from database import clauses_collection, contracts_collection
from utils.pii_masker import unmask_pii

router = APIRouter()

class CommitClauseRequest(BaseModel):
    amended_text: str

@router.put("/{clause_id}/commit")
async def commit_clause(clause_id: str, request: CommitClauseRequest):
    # Retrieve the clause
    clause = await clauses_collection.find_one({"_id": ObjectId(clause_id)})
    if not clause:
        raise HTTPException(status_code=404, detail="Clause not found")
        
    contract_id = clause["contract_id"]
    
    # Retrieve the parent contract to get the pii_mapping
    contract = await contracts_collection.find_one({"_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Parent contract not found")
        
    pii_mapping = contract.get("pii_mapping", {})
    
    # Unmask the text
    final_text = unmask_pii(request.amended_text, pii_mapping)
    
    # Save the final text to the database
    await clauses_collection.update_one(
        {"_id": ObjectId(clause_id)},
        {"$set": {"final_text": final_text}}
    )
    
    return {"message": "Clause committed successfully", "final_text": final_text}
