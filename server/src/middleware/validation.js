/**
 * PRODUCTION-GRADE INPUT VALIDATION MIDDLEWARE
 * Ensures ONLY valid data can be stored in database
 */

const { pool } = require('../db');

/**
 * Validate UUID format
 */
const isValidUUID = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

/**
 * Validate email format (STRICT)
 */
const isValidEmail = (email) => {
    // Strict email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email)) return false;

    // Additional checks
    if (email.includes('..')) return false;  // No consecutive dots
    if (email.startsWith('.') || email.endsWith('.')) return false;

    return true;
};

/**
 * Validate name (ALPHABET ONLY)
 */
const isValidName = (name) => {
    // Only letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s'-]+$/;

    if (!nameRegex.test(name)) return false;
    if (name.trim().length < 2) return false;  // Minimum 2 characters
    if (name.trim().length > 255) return false;  // Maximum 255 characters

    return true;
};

/**
 * Validate phone (DIGITS ONLY)
 */
const isValidPhone = (phone) => {
    // Remove common separators for validation
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

    // Must be digits only, 10-15 characters
    const phoneRegex = /^\+?[0-9]{10,15}$/;

    return phoneRegex.test(cleaned);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
const isValidDate = (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Sanitize string input (PREVENT XSS)
 * Removes HTML tags, scripts, and dangerous characters
 */
const sanitizeString = (str, maxLength = 1000) => {
    if (typeof str !== 'string') return '';

    // Trim whitespace
    let sanitized = str.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove HTML tags and scripts (CRITICAL for XSS prevention)
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<[^>]+>/g, '');

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[<>]/g, '');

    // HTML entity encode remaining special characters
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
};

/**
 * Check if customer exists (FOREIGN KEY VALIDATION)
 */
const customerExists = async (customer_id) => {
    if (!customer_id) return true;  // Null is allowed

    try {
        const result = await pool.query(
            'SELECT 1 FROM customers WHERE id = ? AND deleted_at IS NULL',
            [customer_id]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error('❌ Customer existence check failed:', error);
        return false;
    }
};

/**
 * Check if email is duplicate (DUPLICATE PREVENTION)
 */
const emailIsDuplicate = async (email, excludeId = null) => {
    if (!email) return false;

    try {
        let query = 'SELECT id FROM customers WHERE email = ? AND deleted_at IS NULL';
        const params = [email];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        const result = await pool.query(query, params);
        return result.rows.length > 0;
    } catch (error) {
        console.error('❌ Duplicate email check failed:', error);
        return false;
    }
};

/**
 * Validate and sanitize customer input (PRODUCTION-GRADE)
 */
exports.validateCustomer = async (req, res, next) => {
    try {
        const { account_name, email, phone, industry, tier, mrr, status, health_score } = req.body;

        // ===== REQUIRED FIELDS =====
        if (!account_name || typeof account_name !== 'string' || account_name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ACCOUNT_NAME',
                    message: 'account_name is required and must be a non-empty string',
                    field: 'account_name'
                }
            });
        }

        // ===== NAME VALIDATION (ALPHABET ONLY) =====
        if (!isValidName(account_name)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ACCOUNT_NAME_FORMAT',
                    message: 'account_name must contain only letters, spaces, hyphens, and apostrophes (2-255 characters)',
                    field: 'account_name'
                }
            });
        }

        // ===== EMAIL VALIDATION (STRICT) =====
        if (email) {
            if (!isValidEmail(email)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_EMAIL',
                        message: 'Invalid email format',
                        field: 'email'
                    }
                });
            }

            // ===== DUPLICATE EMAIL CHECK =====
            const isDuplicate = await emailIsDuplicate(email, req.params.id);
            if (isDuplicate) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_EMAIL',
                        message: 'A customer with this email already exists',
                        field: 'email'
                    }
                });
            }
        }

        // ===== PHONE VALIDATION (DIGITS ONLY) =====
        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_PHONE',
                    message: 'Phone number must contain only digits (10-15 characters)',
                    field: 'phone'
                }
            });
        }

        // ===== STATUS ENUM VALIDATION =====
        const validStatuses = ['active', 'at_risk', 'churned', 'inactive'];
        if (status && !validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STATUS',
                    message: `status must be one of: ${validStatuses.join(', ')}`,
                    field: 'status'
                }
            });
        }

        // ===== TIER ENUM VALIDATION =====
        const validTiers = ['Enterprise', 'Standard', 'Growth', 'Starter'];
        if (tier && !validTiers.includes(tier)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TIER',
                    message: `tier must be one of: ${validTiers.join(', ')}`,
                    field: 'tier'
                }
            });
        }

        // ===== INDUSTRY ENUM VALIDATION =====
        const validIndustries = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Other'];
        if (industry && !validIndustries.includes(industry)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INDUSTRY',
                    message: `industry must be one of: ${validIndustries.join(', ')}`,
                    field: 'industry'
                }
            });
        }

        // ===== NUMERIC VALIDATION =====
        if (mrr !== undefined && (typeof mrr !== 'number' || mrr < 0 || mrr > 1000000000)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_MRR',
                    message: 'mrr must be a non-negative number (max $1B)',
                    field: 'mrr'
                }
            });
        }

        if (health_score !== undefined && (typeof health_score !== 'number' || health_score < 0 || health_score > 100)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_HEALTH_SCORE',
                    message: 'health_score must be a number between 0 and 100',
                    field: 'health_score'
                }
            });
        }

        // ===== SANITIZATION (XSS PREVENTION) =====
        req.body.account_name = sanitizeString(account_name, 255);
        if (email) req.body.email = sanitizeString(email, 255);
        if (phone) req.body.phone = sanitizeString(phone, 50);
        if (industry) req.body.industry = sanitizeString(industry, 100);

        next();
    } catch (error) {
        console.error('❌ Validation error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Input validation failed'
            }
        });
    }
};

/**
 * Validate and sanitize task input (PRODUCTION-GRADE)
 */
exports.validateTask = async (req, res, next) => {
    try {
        const { customer_id, title, description, priority, due_date, status } = req.body;

        // ===== REQUIRED FIELDS =====
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_TITLE',
                    message: 'title is required and must be a non-empty string',
                    field: 'title'
                }
            });
        }

        // ===== MINIMUM LENGTH VALIDATION =====
        if (title.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'TITLE_TOO_SHORT',
                    message: 'title must be at least 3 characters',
                    field: 'title'
                }
            });
        }

        // ===== FOREIGN KEY VALIDATION (CRITICAL) =====
        if (customer_id) {
            if (!isValidUUID(customer_id)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_CUSTOMER_ID',
                        message: 'customer_id must be a valid UUID',
                        field: 'customer_id'
                    }
                });
            }

            const exists = await customerExists(customer_id);
            if (!exists) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'CUSTOMER_NOT_FOUND',
                        message: 'customer_id references a non-existent customer',
                        field: 'customer_id'
                    }
                });
            }
        }

        // ===== PRIORITY ENUM VALIDATION =====
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        if (priority && !validPriorities.includes(priority.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_PRIORITY',
                    message: `priority must be one of: ${validPriorities.join(', ')}`,
                    field: 'priority'
                }
            });
        }

        // ===== STATUS ENUM VALIDATION =====
        const validStatuses = ['open', 'in_progress', 'completed', 'cancelled'];
        if (status && !validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_STATUS',
                    message: `status must be one of: ${validStatuses.join(', ')}`,
                    field: 'status'
                }
            });
        }

        // ===== DATE VALIDATION =====
        if (due_date) {
            if (!isValidDate(due_date)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_DUE_DATE',
                        message: 'due_date must be in YYYY-MM-DD format',
                        field: 'due_date'
                    }
                });
            }

            // ===== DATE RANGE VALIDATION (NO PAST DATES) =====
            const dueDate = new Date(due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dueDate < today) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'PAST_DUE_DATE',
                        message: 'due_date cannot be in the past',
                        field: 'due_date'
                    }
                });
            }
        }

        // ===== SANITIZATION (XSS PREVENTION) =====
        req.body.title = sanitizeString(title, 255);
        if (description) req.body.description = sanitizeString(description, 2000);

        next();
    } catch (error) {
        console.error('❌ Validation error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Input validation failed'
            }
        });
    }
};

/**
 * Validate and sanitize contact input (NEW - PRODUCTION-GRADE)
 */
exports.validateContact = async (req, res, next) => {
    try {
        const { customer_id, name, email, phone, title } = req.body;

        // ===== REQUIRED FIELDS =====
        if (!customer_id || !name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MISSING_REQUIRED_FIELDS',
                    message: 'customer_id and name are required'
                }
            });
        }

        // ===== FOREIGN KEY VALIDATION (CRITICAL) =====
        if (!isValidUUID(customer_id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CUSTOMER_ID',
                    message: 'customer_id must be a valid UUID',
                    field: 'customer_id'
                }
            });
        }

        const exists = await customerExists(customer_id);
        if (!exists) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'CUSTOMER_NOT_FOUND',
                    message: 'customer_id references a non-existent customer',
                    field: 'customer_id'
                }
            });
        }

        // ===== NAME VALIDATION (ALPHABET ONLY) =====
        if (!isValidName(name)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_NAME_FORMAT',
                    message: 'name must contain only letters, spaces, hyphens, and apostrophes (2-255 characters)',
                    field: 'name'
                }
            });
        }

        // ===== EMAIL VALIDATION (STRICT) =====
        if (email && !isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_EMAIL',
                    message: 'Invalid email format',
                    field: 'email'
                }
            });
        }

        // ===== PHONE VALIDATION (DIGITS ONLY) =====
        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_PHONE',
                    message: 'Phone number must contain only digits (10-15 characters)',
                    field: 'phone'
                }
            });
        }

        // ===== SANITIZATION (XSS PREVENTION) =====
        req.body.name = sanitizeString(name, 255);
        if (email) req.body.email = sanitizeString(email, 255);
        if (phone) req.body.phone = sanitizeString(phone, 50);
        if (title) req.body.title = sanitizeString(title, 100);

        next();
    } catch (error) {
        console.error('❌ Validation error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Input validation failed'
            }
        });
    }
};

/**
 * Validate UUID parameter
 */
exports.validateUUIDParam = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];

        if (!id || !isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: `${paramName} must be a valid UUID`
                }
            });
        }

        next();
    };
};

/**
 * Validate pagination parameters
 */
exports.validatePagination = (req, res, next) => {
    const { page, limit } = req.query;

    if (page) {
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_PAGE',
                    message: 'page must be a positive integer'
                }
            });
        }
    }

    if (limit) {
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_LIMIT',
                    message: 'limit must be between 1 and 1000'
                }
            });
        }
    }

    next();
};

// Export utility functions
exports.isValidUUID = isValidUUID;
exports.isValidEmail = isValidEmail;
exports.isValidName = isValidName;
exports.isValidPhone = isValidPhone;
exports.isValidDate = isValidDate;
exports.sanitizeString = sanitizeString;
exports.customerExists = customerExists;
exports.emailIsDuplicate = emailIsDuplicate;
