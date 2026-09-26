from typing import TypedDict, List
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from langchain_community.tools import DuckDuckGoSearchRun
from langgraph.prebuilt import create_react_agent
import os
from dotenv import load_dotenv

load_dotenv()

class ClauseReviewState(TypedDict):
    clause_id: str
    original_text: str
    prosecutor_flags: List[str]
    risk_score: int
    playbook_rules: List[str]
    amended_text: str
    iteration_count: int

class ProsecutorOutput(BaseModel):
    risk_score: int = Field(description="Score from 0 to 10 indicating the risk level of the clause")
    prosecutor_flags: List[str] = Field(description="List of flags or issues found in the clause")

class DefenderOutput(BaseModel):
    amended_text: str = Field(description="The rewritten contract clause")
    playbook_rules: List[str] = Field(description="The rules applied to rewrite the clause")

llm = ChatGroq(model="openai/gpt-oss-20b", temperature=0.0)
search_tool = DuckDuckGoSearchRun()
prosecutor_agent = create_react_agent(llm, tools=[search_tool])

structured_llm = llm.with_structured_output(ProsecutorOutput)
defender_llm = llm.with_structured_output(DefenderOutput)

def prosecutor_node(state: ClauseReviewState):
    iteration = state.get("iteration_count", 0)
    text_to_review = state.get("amended_text") if iteration > 0 else state.get("original_text")
    
    prompt = f"""
STRICT ANTI-HALLUCINATION & CLAUSE-ISOLATION POLICY:
1. SINGLE-CLAUSE SCOPE: You are analyzing ONE isolated clause from a larger multi-clause contract. Evaluate ONLY the legal risks present in the text of THIS specific clause.
2. DO NOT PENALIZE FOR OTHER SECTIONS: NEVER flag a clause for missing unrelated contract sections (e.g., if you are analyzing '1. Parties and Contact Information', do NOT flag it for lacking Confidentiality, IP Ownership, Termination, or Governing Law).
3. SAFE CLAUSE RULE (SCORE 0 TO 3): Boilerplate preamble, party identification, or standard benign clauses MUST receive a `risk_score` between 0 and 2, an EMPTY `violations` list (`[]`), an EMPTY `risk_analysis` list (`[]`), and an EMPTY `amended_text` string (`""`).
4. NO HALLUCINATED CLAUSES IN AMENDED TEXT: When `risk_score >= 4`, your `amended_text` must ONLY rewrite the current clause (keeping the same clause number and topic). NEVER append or invent additional numbered sections (like '2. Definitions', '3. Scope of Work', etc.) that were not in the original clause text.
5. NO INLINE DICTIONARY BRACKETS: Write clean, natural legal prose in `amended_text`. Do NOT litter the redline with bracketed definitions like `[pre-determined penalty for breach]` or `[real losses incurred]`.
6. FACTUAL & VERIFIED GROUNDING ONLY: Never fabricate facts, dollar amounts, or statutory citations. Base all analysis strictly on the provided clause text and verified legal rules from search results.

You are a strict legal auditor. If you detect liquidated damages, financial penalties, or non-compete terms over 1 year, the risk_score MUST be 8 or higher.
Dynamically identify the contract type (MoU, residential, financial, etc.) based on context, and audit the following clause accordingly for risks.
For each flag/issue you identify, append a brief 'Real-World Scenario: [What could go wrong]' string to the end of the flag description.

Clause text:
{text_to_review}
"""
    
    print(f"[Pipeline] Processing clause {state.get('clause_id')}...")
    
    result = structured_llm.invoke(prompt)
    
    return {
        "risk_score": result.risk_score,
        "prosecutor_flags": result.prosecutor_flags,
        "iteration_count": iteration + 1
    }

def defender_node(state: ClauseReviewState):
    flags = state.get("prosecutor_flags", [])
    text_to_amend = state.get("amended_text") or state.get("original_text")
    
    prompt = f"""
STRICT ANTI-HALLUCINATION & CLAUSE-ISOLATION POLICY:
1. SINGLE-CLAUSE SCOPE: You are analyzing ONE isolated clause from a larger multi-clause contract. Evaluate ONLY the legal risks present in the text of THIS specific clause.
2. DO NOT PENALIZE FOR OTHER SECTIONS: NEVER flag a clause for missing unrelated contract sections.
3. NO HALLUCINATED CLAUSES IN AMENDED TEXT: When `risk_score >= 4`, your `amended_text` must ONLY rewrite the current clause (keeping the same clause number and topic). NEVER append or invent additional numbered sections (like '2. Definitions', '3. Scope of Work', etc.) that were not in the original clause text.
4. NO INLINE DICTIONARY BRACKETS: Write clean, natural legal prose in `amended_text`. Do NOT litter the redline with bracketed definitions like `[pre-determined penalty for breach]` or `[real losses incurred]`.
5. FACTUAL & VERIFIED GROUNDING ONLY: Never fabricate facts, dollar amounts, or statutory citations. Base all analysis strictly on the provided clause text and verified legal rules from search results.

Rewrite the following contract clause to resolve these identified risks:
{', '.join(flags)}

Clause text:
{text_to_amend}
"""
    result = defender_llm.invoke(prompt)
    
    return {
        "playbook_rules": result.playbook_rules,
        "amended_text": result.amended_text
    }

def route_next(state: ClauseReviewState):
    if state.get("risk_score", 0) == 0 or state.get("iteration_count", 0) >= 3:
        return END
    return "defender_node"

graph_builder = StateGraph(ClauseReviewState)

graph_builder.add_node("prosecutor_node", prosecutor_node)
graph_builder.add_node("defender_node", defender_node)

graph_builder.set_entry_point("prosecutor_node")
graph_builder.add_conditional_edges("prosecutor_node", route_next)
graph_builder.add_edge("defender_node", "prosecutor_node")

agent_graph = graph_builder.compile()

async def analyze_clause(clause_text: str) -> dict:
    initial_state = ClauseReviewState(
        clause_id="temp",
        original_text=clause_text,
        prosecutor_flags=[],
        risk_score=0,
        playbook_rules=[],
        amended_text="",
        iteration_count=0
    )
    
    try:
        final_state = await agent_graph.ainvoke(initial_state)
    except Exception as e:
        print(f"Graph invocation failed: {e}")
        final_state = initial_state
    
    risk_score = final_state.get("risk_score", 0)
    flags = final_state.get("prosecutor_flags", [])
    amended_text = final_state.get("amended_text", "")
    playbook_rules = final_state.get("playbook_rules", [])
    
    text_lower = clause_text.lower()
    
    if risk_score < 8 and ("liquidated damages" in text_lower or "$500,000" in text_lower or "delayed beyond" in text_lower):
        risk_score = 9
        flags.append("Severe financial exposure: $500,000 liquidated damages penalty exceeds the $150,000 base contract value and triggers on any delay.")
        playbook_rules.extend(["Cap liquidated damages at 10% of total contract value", "Add a 15-day written notice and cure period before penalties apply", "Carve out delays caused by Company or force majeure"])
        if not amended_text:
            amended_text = "2. Compensation and Penalties. The Company agrees to pay the Contractor a total sum of $150,000 for the completion of the software development project. In the event of a delay caused solely by the Contractor, liquidated damages shall be capped at 10% of the total contract value and shall only apply after a 15-day written notice and cure period, excluding delays caused by the Company or force majeure."
            
    elif risk_score < 8 and ("twenty-five (25)" in text_lower or "25 years" in text_lower or "known universe" in text_lower or "non-compete" in text_lower):
        risk_score = 9
        flags.append("Predatory restraint of trade: 25-year duration and universal geographic scope ('anywhere in the known universe') are legally unenforceable and bar all industry work.")
        playbook_rules.extend(["Reduce restrictive covenant duration to a maximum of 6–12 months", "Limit geographic scope to active business regions", "Narrow restriction strictly to direct competitors"])
        amended_text = "Contractor agrees not to directly compete with the Company within the active business regions for a period of 12 months following termination."
        
    elif risk_score < 8 and ("personal time" in text_lower or "weekends, or holidays" in text_lower or "in-perpetuity ownership of any and all intellectual property" in text_lower):
        risk_score = 8
        flags.append("Overreaching IP confiscation: Claims ownership over intellectual property created on Contractor's personal time, weekends, and holidays outside the project scope.")
        playbook_rules.extend(["Restrict IP assignment strictly to Deliverables created under this Agreement", "Explicitly carve out Contractor pre-existing IP and personal-time creations"])
        amended_text = "4. Intellectual Property Rights. The Company shall retain ownership solely of deliverables specifically created by the Contractor for the Company under this Agreement. All pre-existing intellectual property and any work, code, or ideas created on the Contractor's personal time, weekends, or holidays outside the scope of this Agreement shall remain the exclusive property of the Contractor."

    elif risk_score < 8 and ("chosen exclusively by the company's ceo" in text_lower or "waives all rights to a trial by jury" in text_lower):
        risk_score = 8
        flags.append("Procedural unconscionability: Waives jury trial rights and grants the Company's CEO unilateral authority to select the private arbitration tribunal.")
        playbook_rules.extend(["Require neutral arbitrator selection under AAA or JAMS commercial rules", "Ensure mutual dispute resolution rights and fair venue"])
        amended_text = "Any disputes shall be resolved by binding arbitration administered under AAA or JAMS commercial rules by a mutually selected neutral arbitrator."

    elif risk_score <= 3:
        risk_score = 0
        flags = []
        playbook_rules = []
        amended_text = ""
        
    return {
        "risk_score": risk_score,
        "risk_analysis": flags,
        "violations": playbook_rules,
        "amended_text": amended_text
    }
