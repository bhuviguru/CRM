-- Add customer lifecycle stages
ALTER TABLE customers ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(20) DEFAULT 'lead' CHECK (lifecycle_stage IN ('lead', 'trial', 'active', 'renewal', 'churned', 'won_back'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS trial_start_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS trial_end_date DATE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_lifecycle ON customers(lifecycle_stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_renewal_date ON customers(renewal_date) WHERE deleted_at IS NULL;

-- Add webhook events tracking
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON webhook_logs(event_type);

-- Add playbook priority index
CREATE INDEX IF NOT EXISTS idx_playbooks_priority ON playbooks(priority DESC) WHERE enabled = TRUE;
