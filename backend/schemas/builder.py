from pydantic import BaseModel
from typing import Optional

class ContractGenerationRequest(BaseModel):
    # Existing Drafting Fields
    agreement_type: Optional[str] = ""
    jurisdiction: Optional[str] = ""
    primary_party: Optional[str] = ""
    counter_party: Optional[str] = ""
    posture: Optional[str] = ""
    special_provisions: Optional[str] = ""
    
    # New Copilot Context Fields
    full_contract_context: Optional[str] = "" 
    current_clause: Optional[str] = ""
    user_query: Optional[str] = ""
