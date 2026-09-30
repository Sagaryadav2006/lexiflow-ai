import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import contracts, clauses

app = FastAPI(title="LexiFlow AI Backend")

# Configure CORS for React frontend (Localhost + Vercel Cloud)
origins = [
    "http://localhost:3000",
    "http://localhost:5173", # Vite default
]

# Add specific frontend URL if provided in environment variables
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Safely allow any Vercel deployment URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])
app.include_router(clauses.router, prefix="/api/clauses", tags=["Clauses"])

@app.get("/")
async def root():
    return {"message": "LexiFlow AI API is running"}