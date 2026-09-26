from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import contracts, clauses

app = FastAPI(title="LexiFlow AI Backend")

# Configure CORS for React frontend
origins = [
    "http://localhost:3000",
    "http://localhost:5173", # Vite default
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contracts.router, prefix="/api/contracts", tags=["Contracts"])
app.include_router(clauses.router, prefix="/api/clauses", tags=["Clauses"])

@app.get("/")
async def root():
    return {"message": "LexiFlow AI API is running"}
