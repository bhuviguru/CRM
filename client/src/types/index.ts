export type CustomerStatus = "Active" | "At Risk" | "Churned" | "Inactive";

export interface BaseCustomer {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
}

export interface Customer extends BaseCustomer {
    status: CustomerStatus;
    healthScore: number;
    lastActive: string;
    tier?: string;
    mrr?: number;
}

export interface RiskCustomer extends BaseCustomer {
    risk: "High" | "Medium" | "Low";
    probability: number;
    reason: string;
    action: string;
}
