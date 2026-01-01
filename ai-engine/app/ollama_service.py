import requests
import json

class OllamaService:
    def __init__(self, base_url="http://localhost:11434"):
        self.base_url = base_url
        self.model = "llama3.2"  # or "mistral", "phi3", etc.
    
    def generate(self, prompt, system_prompt=None):
        """Generate text using Ollama"""
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False
        }
        
        if system_prompt:
            payload["system"] = system_prompt
        
        try:
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()["response"]
        except Exception as e:
            print(f"Ollama error: {e}")
            return None
    
    def generate_churn_explanation(self, customer_data, churn_probability, top_factors):
        """Generate natural language explanation for churn prediction"""
        system_prompt = """You are a Customer Success AI assistant. 
Your role is to explain churn risk predictions in clear, actionable language for CS teams.
Be concise, professional, and focus on actionable insights."""
        
        factors_text = "\n".join([
            f"- {f['feature'].replace('_', ' ')}: {f['feature_value']} (impact: {f['impact']:.2f}, {f['direction']})"
            for f in top_factors[:3]
        ])
        
        prompt = f"""Analyze this customer's churn risk:

Churn Probability: {churn_probability:.1%}
Key Factors:
{factors_text}

Provide a 2-3 sentence explanation of why this customer is at risk and what the CS team should focus on."""
        
        return self.generate(prompt, system_prompt)
    
    def generate_recommendations(self, customer_data, risk_level, top_factors):
        """Generate actionable recommendations"""
        system_prompt = """You are a Customer Success strategist. 
Generate specific, actionable recommendations for CS teams to reduce churn risk.
Each recommendation should be concrete and executable."""
        
        factors_text = "\n".join([
            f"- {f['feature'].replace('_', ' ')}: {f['feature_value']}"
            for f in top_factors[:3]
        ])
        
        prompt = f"""Customer Risk Level: {risk_level}

Problem Areas:
{factors_text}

Generate 3 specific, actionable recommendations for the CS team. Format as a numbered list."""
        
        response = self.generate(prompt, system_prompt)
        
        if response:
            # Parse numbered list
            lines = [line.strip() for line in response.split('\n') if line.strip()]
            recommendations = [line.lstrip('0123456789. ') for line in lines if any(c.isdigit() for c in line[:3])]
            return recommendations[:3]
        
        return []
    
    def analyze_customer_health(self, customer_data):
        """Generate overall customer health analysis"""
        system_prompt = """You are a Customer Success analyst.
Provide a brief, insightful analysis of customer health based on their metrics."""
        
        prompt = f"""Analyze this customer's health:

- Login Frequency (30d): {customer_data.get('login_frequency_30d', 'N/A')}
- Support Tickets (30d): {customer_data.get('support_tickets_30d', 'N/A')}
- Feature Adoption: {customer_data.get('feature_adoption_rate', 'N/A')}
- NPS Score: {customer_data.get('nps_score', 'N/A')}

Provide a 1-2 sentence health summary."""
        
        return self.generate(prompt, system_prompt)

# Singleton instance
ollama_service = OllamaService()
