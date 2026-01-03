const { pool } = require('./src/db/sqlite');

async function testTaskUpdate() {
    try {
        const taskId = 'af62750c-3c20-448f-b818-69f736c68db5';
        const status = 'completed';

        const updates = [];
        const values = [];

        updates.push(`status = ?`);
        values.push(status);

        if (status === 'completed') {
            updates.push(`completed_at = datetime('now')`);
        }

        const query = `
            UPDATE tasks
            SET ${updates.join(', ')}, updated_at = datetime('now')
            WHERE id = ?
        `;

        values.push(taskId);

        console.log('Query:', query);
        console.log('Values:', values);

        const result = await pool.query(query, values);
        console.log('Update result:', result);

        const selectResult = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
        console.log('Task after update:', selectResult.rows[0]);

    } catch (error) {
        console.error('Error:', error);
        console.error('Message:', error.message);
        console.error('Code:', error.code);
    }

    process.exit(0);
}

testTaskUpdate();
