import { Customer, RiskCustomer } from "@/types"

export const initialCustomers: Customer[] = [
    {
        id: "CUST-001",
        name: "Alice Johnson",
        email: "alice@techcorp.com",
        phone: "+15550201",
        status: "Active",
        healthScore: 92,
        lastActive: "2 hours ago",
    },
    {
        id: "CUST-002",
        name: "Bob Smith",
        email: "bob@startuplab.io",
        phone: "+15550202",
        status: "At Risk",
        healthScore: 45,
        lastActive: "14 days ago",
    },
    {
        id: "CUST-003",
        name: "Charlie Davis",
        email: "charlie@enterprise.net",
        phone: "+15550203",
        status: "Active",
        healthScore: 88,
        lastActive: "1 day ago",
    },
    {
        id: "CUST-004",
        name: "Diana Prince",
        email: "diana@wonder.com",
        phone: "+15550204",
        status: "Churned",
        healthScore: 12,
        lastActive: "45 days ago",
    },
    {
        id: "CUST-005",
        name: "Evan Wright",
        email: "evan@logic.org",
        phone: "+15550205",
        status: "At Risk",
        healthScore: 55,
        lastActive: "5 days ago",
    },
]

export const riskCustomers: RiskCustomer[] = [
    {
        id: "CUST-002",
        name: "Bob Smith",
        email: "bob@startuplab.io",
        phone: "+15550101",
        company: "StartupLab",
        risk: "High",
        probability: 78,
        reason: "Usage dropped 40% in last 30 days",
        action: "Schedule Review",
    },
    {
        id: "CUST-005",
        name: "Evan Wright",
        email: "evan@logic.org",
        phone: "+15550102",
        company: "Logic.org",
        risk: "Medium",
        probability: 55,
        reason: "Negative sentiment in support ticket #442",
        action: "Send Discount",
    },
    {
        id: "CUST-009",
        name: "Sarah Connors",
        email: "sarah@skynet.inc",
        phone: "+15550103",
        company: "SkyNet Inc",
        risk: "High",
        probability: 82,
        reason: "No login for 21 days",
        action: "Call Customer",
    },
]

export const weeklyData = [
    { day: "Mon", engagement: 400, sentiment: 240 },
    { day: "Tue", engagement: 300, sentiment: 139 },
    { day: "Wed", engagement: 200, sentiment: 580 },
    { day: "Thu", engagement: 278, sentiment: 390 },
    { day: "Fri", engagement: 189, sentiment: 480 },
    { day: "Sat", engagement: 239, sentiment: 380 },
    { day: "Sun", engagement: 349, sentiment: 430 },
]

export const churnData = [
    { name: "Jan", churn: 4 },
    { name: "Feb", churn: 3 },
    { name: "Mar", churn: 2 },
    { name: "Apr", churn: 6 },
    { name: "May", churn: 8 },
    { name: "Jun", churn: 9 },
    { name: "Jul", churn: 12 },
]

export const defaultUserSettings = {
    name: "Sales Manager",
    email: "manager@company.com"
}
