exports.getChurnPrediction = async data => {
    // Access AI Engine via Docker Service Name "ai-engine"
    const aiUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000';

    try {
        const response = await fetch(`${aiUrl}/predict/churn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`AI Engine error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('AI Service Error:', error);
        throw error;
    }
};
