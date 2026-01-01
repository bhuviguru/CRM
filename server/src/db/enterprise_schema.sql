-- Phase 1: Enterprise Data Foundation Schema

-- 1. Enhanced Customers Table
DROP TABLE IF EXISTS customers CASCADE;
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name VARCHAR(255) NOT NULL,
    account_owner_id UUID,
    industry VARCHAR(50),
    tier VARCHAR(20) CHECK (tier IN ('Enterprise', 'Mid-Market', 'SMB')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'At Risk', 'Churned', 'Onboarding')),
    health_score INTEGER DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
    health_trend VARCHAR(20) CHECK (health_trend IN ('improving', 'stable', 'declining')),
    mrr DECIMAL(10, 2),
    arr DECIMAL(10, 2),
    contract_start_date DATE,
    contract_end_date DATE,
    renewal_date DATE,
    
    -- Primary Contact (JSON)
    primary_contact JSONB,
    
    -- Usage Metrics (JSON)
    usage_metrics JSONB,
    
    -- Tags
    tags TEXT[],
    
    -- Custom Fields
    custom_fields JSONB,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    version INTEGER DEFAULT 1,
    
    -- Indexes
    CONSTRAINT customers_account_name_key UNIQUE (account_name) WHERE deleted_at IS NULL
);

CREATE INDEX idx_customers_status ON customers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_health_score ON customers(health_score) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_owner ON customers(account_owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_deleted ON customers(deleted_at);

-- 2. AI Predictions Table
CREATE TABLE ai_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    prediction_type VARCHAR(50) NOT NULL CHECK (prediction_type IN ('churn', 'upsell', 'renewal', 'expansion')),
    
    -- Result
    probability DECIMAL(5, 4) CHECK (probability BETWEEN 0 AND 1),
    confidence DECIMAL(5, 4) CHECK (confidence BETWEEN 0 AND 1),
    risk_level VARCHAR(20) CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    
    -- Model Info
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    algorithm VARCHAR(100),
    
    -- Input Features
    input_features JSONB,
    
    -- Explanation
    explanation JSONB,
    
    -- Timestamps
    predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Human Override
    overridden BOOLEAN DEFAULT FALSE,
    overridden_by UUID,
    overridden_at TIMESTAMP,
    override_justification TEXT,
    override_value JSONB
);

CREATE INDEX idx_predictions_customer ON ai_predictions(customer_id);
CREATE INDEX idx_predictions_expires ON ai_predictions(expires_at);
CREATE INDEX idx_predictions_type ON ai_predictions(prediction_type);

-- 3. Activity Logs Table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    activity_type VARCHAR(50) NOT NULL,
    performed_by UUID,
    title VARCHAR(255),
    description TEXT,
    metadata JSONB,
    sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_customer ON activity_logs(customer_id);
CREATE INDEX idx_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);

-- 4. Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'viewed')),
    user_id UUID,
    changes JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

-- 5. Playbooks Table
CREATE TABLE playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger JSONB NOT NULL,
    actions JSONB NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_triggered_at TIMESTAMP,
    execution_count INTEGER DEFAULT 0
);

CREATE INDEX idx_playbooks_enabled ON playbooks(enabled);

-- 6. Playbook Executions Table
CREATE TABLE playbook_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('running', 'completed', 'failed')),
    actions_executed JSONB,
    error_message TEXT
);

CREATE INDEX idx_executions_playbook ON playbook_executions(playbook_id);
CREATE INDEX idx_executions_customer ON playbook_executions(customer_id);

-- 7. Update Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
