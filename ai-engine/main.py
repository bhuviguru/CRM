from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.model import churn_model
from app.api import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load/Train model on startup
    churn_model.train()
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"status": "Self-Healing CRM AI Engine Running", "model_ready": churn_model.model is not None}

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
