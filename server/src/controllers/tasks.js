const { pool } = require('../db');
// const { auditLog } = require('../db/helpers');

/**
 * Get all tasks with filters
 */
exports.getAllTasks = async (req, res) => {
    const { customer_id, assigned_to, status, priority, page = 1, limit = 50 } = req.query;

    try {
        let query =
            'SELECT t.*, c.account_name FROM tasks t LEFT JOIN customers c ON t.customer_id = c.id WHERE (t.deleted_at IS NULL OR t.deleted_at = \'\')';
        const params = [];

        if (customer_id) {
            query += ` AND t.customer_id = ?`;
            params.push(customer_id);
        }

        if (assigned_to) {
            query += ` AND t.assigned_to = ?`;
            params.push(assigned_to);
        }

        if (status) {
            query += ` AND t.status = ?`;
            params.push(status);
        }

        if (priority) {
            query += ` AND t.priority = ?`;
            params.push(priority);
        }

        // Simplified ORDER BY for SQLite compatibility
        query += ` ORDER BY 
            CASE t.priority 
                WHEN 'urgent' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
                ELSE 5
            END,
            CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
            t.due_date ASC,
            t.created_at DESC
            LIMIT ? OFFSET ?`;

        const offset = (page - 1) * limit;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);
        res.json({ data: result.rows });
    } catch (err) {
        console.error('Tasks error:', err);
        res.status(500).json({ error: 'Failed to fetch tasks', details: err.message });
    }
};

/**
 * Create task
 * @route POST /api/tasks
 * @body {object} task - Task data
 */
exports.createTask = async (req, res) => {
    // Extract req.user if available (from auth middleware)
    const userId = req.user ? req.user.id : null;
    const { customer_id, title, description, assigned_to, priority, due_date, status } = req.body;

    try {
        // ===== VALIDATION =====
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'title is required and must be a non-empty string'
            });
        }

        // Validate priority enum
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        const normalizedPriority = priority ? priority.toLowerCase() : 'medium';
        if (!validPriorities.includes(normalizedPriority)) {
            return res.status(400).json({
                error: 'Validation failed',
                message: `priority must be one of: ${validPriorities.join(', ')}`
            });
        }

        // ===== DATE HANDLING =====
        let formattedDueDate = null;
        if (due_date) {
            // Handle YYYY-MM-DD format from HTML5 date input
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (dateRegex.test(due_date)) {
                // Convert to ISO datetime for SQLite
                formattedDueDate = `${due_date}T00:00:00.000Z`;
            } else {
                // Try parsing as Date
                const parsedDate = new Date(due_date);
                if (!isNaN(parsedDate.getTime())) {
                    formattedDueDate = parsedDate.toISOString();
                } else {
                    return res.status(400).json({
                        error: 'Validation failed',
                        message: 'due_date must be a valid date in YYYY-MM-DD format'
                    });
                }
            }
        }

        // ===== DEFAULT VALUES =====
        const taskId = require('crypto').randomUUID();
        const taskData = {
            id: taskId,
            customer_id: customer_id || null,
            title: title.trim(),
            description: description ? description.trim() : null,
            assigned_to: assigned_to || userId || 'admin', // Assign to creator by default if not specified
            priority: normalizedPriority,
            due_date: formattedDueDate,
            created_by: userId || 'system', // Use authenticated user ID
            status: status || 'open' // Default to open
        };

        // ===== DATABASE INSERT =====
        const query = `
            INSERT INTO tasks (
                id, customer_id, title, description, assigned_to, 
                priority, due_date, created_by, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.query(query, [
            taskData.id,
            taskData.customer_id,
            taskData.title,
            taskData.description,
            taskData.assigned_to,
            taskData.priority,
            taskData.due_date,
            taskData.created_by,
            taskData.status
        ]);

        // ===== FETCH CREATED TASK =====
        const result = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
        const createdTask = result.rows[0];

        if (!createdTask) {
            throw new Error('Task created but not found in database');
        }

        console.log(`✅ Task created successfully: ${taskId} - "${taskData.title}"`);
        res.status(201).json(createdTask);

    } catch (err) {
        console.error('❌ Create task error:', {
            message: err.message,
            code: err.code,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });

        // Return detailed error in development, generic in production
        res.status(500).json({
            error: 'Failed to create task',
            message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while creating the task'
        });
    }
};

/**
 * Update task
 */
exports.updateTask = async (req, res) => {
    const { id } = req.params;
    const { status, assigned_to, priority, due_date } = req.body;

    try {
        const updates = [];
        const values = [];

        if (status) {
            updates.push(`status = ?`);
            values.push(status);

            if (status === 'completed') {
                updates.push(`completed_at = datetime('now')`);
            }
        }

        if (assigned_to) {
            updates.push(`assigned_to = ?`);
            values.push(assigned_to);
        }

        if (priority) {
            updates.push(`priority = ?`);
            values.push(priority);
        }

        if (due_date) {
            updates.push(`due_date = ?`);
            values.push(due_date);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        const query = `
            UPDATE tasks
            SET ${updates.join(', ')}, updated_at = datetime('now')
            WHERE id = ?
        `;

        values.push(id);

        console.log('🔍 Update Task Debug:');
        console.log('  Query:', query);
        console.log('  Values:', values);
        console.log('  Task ID:', id);

        await pool.query(query, values);

        const result = await pool.query('SELECT * FROM tasks WHERE id = ?', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Update task error:', err);
        console.error('  Error message:', err.message);
        console.error('  Error code:', err.code);
        console.error('  Error stack:', err.stack);
        res.status(500).json({ error: 'Failed to update task' });
    }
};

/**
 * Delete task (soft delete)
 */
exports.deleteTask = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("UPDATE tasks SET deleted_at = datetime('now') WHERE id = ?", [id]);

        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.error('Delete task error:', err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
};
