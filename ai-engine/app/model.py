import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

class ChurnModel:
    def __init__(self):
        self.model = None

    def train(self):
        print("Generating synthetic data...")
        np.random.seed(42)
        n_samples = 1000
        
        data = pd.DataFrame({
            'support_tickets': np.random.poisson(2, n_samples),
            'email_response_time': np.random.exponential(10, n_samples),
            'usage_frequency': np.random.normal(20, 10, n_samples),
            'contract_value': np.random.normal(2000, 500, n_samples)
        })
        
        data['usage_frequency'] = data['usage_frequency'].clip(0, 100)
        
        # Target Logic
        churn_prob = (
            (data['support_tickets'] * 0.15) + 
            (data['email_response_time'] * 0.05) - 
            (data['usage_frequency'] * 0.02)
        )
        churn_prob = (churn_prob - churn_prob.min()) / (churn_prob.max() - churn_prob.min())
        data['churn'] = (churn_prob > 0.6).astype(int)
        
        print("Training Random Forest model...")
        X = data.drop('churn', axis=1)
        y = data['churn']
        
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X, y)
        print("Model trained successfully!")

    def predict(self, data: pd.DataFrame):
        if not self.model:
            raise Exception("Model not trained")
        return self.model.predict(data)[0], self.model.predict_proba(data)[0][1]

# Singleton instance
churn_model = ChurnModel()
