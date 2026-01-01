const { pool } = require('../db');
const { auditLog } = require('../db/helpers');
const aiService = require('../services/ai');

/**
 * Predict churn for customer (proxy to AI engine)
 */
exports.predictChurn = async (req, res) => {
    try {
        const prediction = await aiService.getChurnPrediction(req.body);
        res.json(prediction);
    } catch (err) {
        console.error(err);
        res.status(503).json({ error: 'AI Prediction Service unavailable' });
    }
};

/**
 * Get AI prediction for customer (with caching)
 */
exports.getPrediction = async (req, res) => {
    const { customerId } = req.params;

    try {
        // Check for valid (non-expired) prediction
        const query = `
            SELECT * FROM ai_predictions
            WHERE customer_id = $1
              AND prediction_type = 'churn'
              AND expires_at > CURRENT_TIMESTAMP
              AND overridden = FALSE
            ORDER BY predicted_at DESC
            LIMIT 1
        `;

        const result = await pool.query(query, [customerId]);

        if (result.rows.length > 0) {
            return res.json({
                ...result.rows[0],
                cached: true
            });
        }

        res.status(404).json({
            error: 'No valid prediction found',
            message: 'Prediction expired or not yet generated. Please trigger re-analysis.'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch prediction' });
    }
};

/**
 * Override AI prediction with human judgment
 */
exports.overridePrediction = async (req, res) => {
    const { predictionId } = req.params;
    const { new_risk_level, justification, user_id } = req.body;

    if (!justification || justification.length < 20) {
        return res.status(400).json({
            error: 'Justification required',
            message:
                'Please provide a detailed reason (minimum 20 characters) for overriding the AI prediction.'
        });
    }

    try {
        // Get current prediction
        const currentResult = await pool.query('SELECT * FROM ai_predictions WHERE id = $1', [
            predictionId
        ]);

        if (currentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Prediction not found' });
        }

        const before = currentResult.rows[0];

        // Update with override
        const query = `
            UPDATE ai_predictions
            SET overridden = TRUE,
                overridden_by = $1,
                overridden_at = CURRENT_TIMESTAMP,
                override_justification = $2,
                override_value = $3
            WHERE id = $4
            RETURNING *
        `;

        const overrideValue = {
            original_risk_level: before.risk_level,
            new_risk_level,
            original_probability: before.probability
        };

        const result = await pool.query(query, [
            user_id,
            justification,
            JSON.stringify(overrideValue),
            predictionId
        ]);

        const after = result.rows[0];

        // Audit log
        await auditLog(
            'ai_prediction',
            predictionId,
            'updated',
            user_id,
            { before, after, override: true },
            req
        );

        res.json({
            message: 'Prediction overridden successfully',
            prediction: after
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to override prediction' });
    }
};

/**
 * Get prediction history for customer
 */
exports.getPredictionHistory = async (req, res) => {
    const { customerId } = req.params;
    const { limit = 10 } = req.query;

    try {
        const query = `
            SELECT * FROM ai_predictions
            WHERE customer_id = $1
            ORDER BY predicted_at DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [customerId, parseInt(limit)]);

        res.json({
            customer_id: customerId,
            predictions: result.rows,
            total: result.rows.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch prediction history' });
    }
};

/**
 * Get model performance metrics
 */
exports.getModelPerformance = async (req, res) => {
    try {
        // Calculate metrics from historical predictions
        const query = `
            SELECT 
                COUNT(*) as total_predictions,
                AVG(confidence) as avg_confidence,
                COUNT(CASE WHEN overridden = TRUE THEN 1 END) as override_count,
                COUNT(CASE WHEN risk_level = 'Critical' THEN 1 END) as critical_count,
                COUNT(CASE WHEN risk_level = 'High' THEN 1 END) as high_count,
                COUNT(CASE WHEN risk_level = 'Medium' THEN 1 END) as medium_count,
                COUNT(CASE WHEN risk_level = 'Low' THEN 1 END) as low_count
            FROM ai_predictions
            WHERE predicted_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
        `;

        const result = await pool.query(query);
        const stats = result.rows[0];

        res.json({
            period: 'last_30_days',
            total_predictions: parseInt(stats.total_predictions),
            average_confidence: parseFloat(stats.avg_confidence || 0).toFixed(4),
            override_rate:
                (
                    (parseInt(stats.override_count) / parseInt(stats.total_predictions)) *
                    100
                ).toFixed(2) + '%',
            risk_distribution: {
                critical: parseInt(stats.critical_count),
                high: parseInt(stats.high_count),
                medium: parseInt(stats.medium_count),
                low: parseInt(stats.low_count)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch model performance' });
    }
};
