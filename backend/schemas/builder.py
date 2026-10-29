from pydantic import BaseModel

class ContractGenerationRequest(BaseModel):
    agreement_type: str
    jurisdiction: str
    primary_party: str
    counter_party: str
    posture: str
    special_provisions: str

