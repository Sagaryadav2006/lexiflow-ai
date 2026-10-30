from pydantic import BaseModel
from typing import List

class CounselChatRequest(BaseModel):
    query: str

class CounselChatResponse(BaseModel):
    answer: str
    sources: List[str]

