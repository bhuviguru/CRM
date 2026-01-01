from pydantic import BaseModel
from typing import List, Optional

class CustomerData(BaseModel):
    support_tickets: int
    email_response_time: float
    usage_frequency: float
    contract_value: float

class FeatureFactor(BaseModel):
    feature: str
    impact: float
    direction: str
    feature_value: float

class PredictionExplanation(BaseModel):
    top_factors: List[FeatureFactor]
    reasoning: str

class PredictionResult(BaseModel):
    churn_prediction: int
    churn_probability: float
    risk_level: str
    confidence: float
    model_version: str
    explanation: PredictionExplanation
    recommended_actions: List[str]
    predicted_at: str
    expires_at: str

class ModelInfo(BaseModel):
    model_name: str
    version: str
    algorithm: str
    features: List[str]
    trained_at: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    is_ready: bool
