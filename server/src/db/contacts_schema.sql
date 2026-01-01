-- Contacts table (if not exists)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    title VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_customer ON contacts(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE deleted_at IS NULL;

-- Insert sample contacts
INSERT INTO contacts (customer_id, name, email, phone, title, is_primary)
SELECT 
    c.id,
    'John Doe',
    'john.doe@' || LOWER(REPLACE(c.account_name, ' ', '')) || '.com',
    '+1-555-' || LPAD((RANDOM() * 10000)::INT::TEXT, 4, '0'),
    'CTO',
    TRUE
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM contacts WHERE customer_id = c.id
)
LIMIT 10;
