const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'sahayak.db');
const db = new Database(dbPath);

console.log('Connected to database at', dbPath);

// Get existing customers to link tasks to
const customers = db.prepare('SELECT id, primary_contact_name as name FROM customers').all();

if (customers.length === 0) {
    console.error('No customers found! Please seed customers first.');
    process.exit(1);
}

console.log(`Found ${customers.length} customers. Seeding tasks...`);

const tasks = [
    {
        title: "Q1 Business Review",
        description: "Schedule quarterly review to discuss performance and goals.",
        status: "Open",
        priority: "High",
        due_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
        type: "Meeting"
    },
    {
        title: "Update Contract Terms",
        description: "Revise SLA details for the upcoming renewal period.",
        status: "In Progress",
        priority: "Medium",
        due_date: new Date(Date.now() + 86400000 * 5).toISOString(),
        type: "Contract"
    },
    {
        title: "Resolve Ticket #4452",
        description: "Technical issue reporting API latency spikes.",
        status: "Open",
        priority: "High",
        due_date: new Date(Date.now() + 86400000).toISOString(),
        type: "Support"
    },
    {
        title: "Onboarding Session",
        description: "Walkthrough of new features for the marketing team.",
        status: "Completed",
        priority: "Low",
        due_date: new Date(Date.now() - 86400000).toISOString(),
        type: "Meeting"
    },
    {
        title: "Send Renewal Proposal",
        description: "Draft and send the contract renewal proposal for 2026.",
        status: "Open",
        priority: "High",
        due_date: new Date(Date.now() + 86400000 * 10).toISOString(),
        type: "Sales"
    },
    {
        title: "Feature Request Follow-up",
        description: "Check status of the requested dashboard export feature.",
        status: "In Progress",
        priority: "Low",
        due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
        type: "Product"
    },
    {
        title: "Churn Risk Assessment",
        description: "Analyze usage patterns to mitigate potential churn.",
        status: "Open",
        priority: "High",
        due_date: new Date(Date.now() + 86400000 * 1).toISOString(),
        type: "Analysis"
    },
    {
        title: "Feedback Survey",
        description: "Collect feedback on the recent deployment.",
        status: "Completed",
        priority: "Medium",
        due_date: new Date(Date.now() - 86400000 * 2).toISOString(),
        type: "Feedback"
    },
    {
        title: "Integration Support",
        description: "Assist with Slack integration setup.",
        status: "Open",
        priority: "Medium",
        due_date: new Date(Date.now() + 86400000 * 4).toISOString(),
        type: "Support"
    },
    {
        title: "Executive Check-in",
        description: "Monthly touchpoint with the VP.",
        status: "Open",
        priority: "Medium",
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        type: "Meeting"
    }
];

const insertTask = db.prepare(`
    INSERT INTO tasks (id, customer_id, title, description, status, priority, due_date, created_at, updated_at)
    VALUES (@id, @customer_id, @title, @description, @status, @priority, @due_date, @created_at, @updated_at)
`);

db.transaction(() => {
    // Clear existing tasks? Maybe keep user's "sinchan" task.
    // db.prepare('DELETE FROM tasks').run(); 

    let taskCount = 0;

    // Distribute tasks across customers
    tasks.forEach((task, index) => {
        const customer = customers[index % customers.length];

        insertTask.run({
            id: uuidv4(),
            customer_id: customer.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        console.log(`Added task "${task.title}" for ${customer.name}`);
        taskCount++;
    });

    console.log(`Successfully added ${taskCount} tasks.`);
})();

console.log('Task seeding verified.');
