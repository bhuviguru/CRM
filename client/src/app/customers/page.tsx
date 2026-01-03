"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, RefreshCw } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Customer } from "@/types"
import { CallingOverlay } from "@/components/calling-overlay"
import { api } from "@/services/api"

import { CustomerDetailsSheet } from "@/components/customer-details-sheet"
import { Eye } from "lucide-react"

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Fetch real customer data from API
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                setIsLoading(true)
                const response = await api.customer.getAll()

                // Handle various backend response formats (unifying data access)
                const data = response as any
                const customersArray = data.customers || data.data || []

                // Ensure we have an array
                if (!Array.isArray(customersArray)) {
                    console.error('Invalid customers data format:', data)
                    setCustomers([])
                    return
                }

                // Transform backend data to frontend format
                const transformedCustomers = customersArray.map((c: any) => ({
                    id: c.id,
                    name: c.account_name,
                    email: c.email || c.primary_contact_email || 'N/A',
                    phone: c.phone || c.primary_contact_phone || 'N/A',
                    status: c.status || 'Active',
                    tier: c.tier || 'Standard',
                    healthScore: c.health_score || 0,
                    mrr: c.mrr || 0,
                    lastActive: c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'Just now'
                }))

                setCustomers(transformedCustomers)
            } catch (error: any) {
                console.error('Failed to fetch customers:', error)
                setCustomers([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchCustomers()
    }, [])
    const [newCustomer, setNewCustomer] = useState({
        name: "",
        email: "",
        phone: "",
        support_tickets: 0,
        email_response_time: 24,
        usage_frequency: 20,
        contract_value: 1000
    })
    const [callingCustomer, setCallingCustomer] = useState<{ name: string, phone: string } | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [isReanalyzing, setIsReanalyzing] = useState(false)

    const handleAddCustomer = async () => {
        if (!newCustomer.name || !newCustomer.email) {
            alert("Name and Email are required")
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(newCustomer.email)) {
            alert("Please enter a valid email address (e.g. user@example.com)")
            return
        }

        setIsAnalyzing(true)

        try {
            // 1. Get AI prediction first
            const usageData = {
                support_tickets: newCustomer.support_tickets,
                email_response_time: newCustomer.email_response_time,
                usage_frequency: newCustomer.usage_frequency,
                contract_value: newCustomer.contract_value
            }

            let riskLevel = 'active';
            let healthScore = 50;

            try {
                const prediction = await api.ai.predictChurn(usageData)
                healthScore = Math.round((1 - prediction.churn_probability) * 100)
                riskLevel = prediction.risk_level === 'High' ? 'at_risk' : 'active'
            } catch (aiError) {
                console.warn("AI Prediction failed, using defaults:", aiError)
                // Fallback defaults already set
            }

            // 2. Save to backend database
            const created = await api.customer.create({
                account_name: newCustomer.name,
                email: newCustomer.email,
                phone: newCustomer.phone,
                industry: 'Technology',
                tier: 'Standard',
                mrr: newCustomer.contract_value / 12,
                status: riskLevel,
                health_score: healthScore
            })

            // 3. Update UI immediately (Optimistic / Direct Update)
            const newCustomerEntry: Customer = {
                id: created.id,
                name: created.account_name,
                email: created.email || 'N/A',
                phone: created.phone || '',
                status: (created.status?.toLowerCase() === 'at_risk' || created.status === 'At Risk') ? 'At Risk' : 'Active',
                tier: created.tier || 'Standard',
                healthScore: created.health_score || healthScore,
                mrr: created.mrr || 0,
                lastActive: 'Just now'
            }

            setCustomers(prev => [newCustomerEntry, ...prev])
            setIsOpen(false)
            setNewCustomer({
                name: "",
                email: "",
                phone: "",
                support_tickets: 0,
                email_response_time: 24,
                usage_frequency: 20,
                contract_value: 1000
            })
        } catch (error) {
            console.error("Failed to add customer:", error)
            alert("Failed to add customer. Please check console for details.")
        } finally {
            setIsAnalyzing(false)
        }
    }

    const handleReanalyzeAll = async () => {
        setIsReanalyzing(true)
        try {
            const result = await api.customer.analyzeAll()
            alert(`Analysis complete! ${result.analyzed} customers analyzed, ${result.failed} failed.`)
            window.location.reload()
        } catch (error) {
            console.error("Re-analysis failed:", error)
            alert("Failed to re-analyze customers. Check backend connection.")
        } finally {
            setIsReanalyzing(false)
        }
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
                    <p className="text-muted-foreground">
                        Manage and monitor your customer base.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleReanalyzeAll}
                        disabled={isReanalyzing}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isReanalyzing ? 'animate-spin' : ''}`} />
                        {isReanalyzing ? 'Analyzing...' : 'Re-Analyze All'}
                    </Button>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button>Add Customer</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Add Customer</DialogTitle>
                                <DialogDescription>
                                    Add a new customer with their usage data for AI risk analysis.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">Name</Label>
                                    <Input
                                        id="name"
                                        value={newCustomer.name}
                                        onChange={(e) => {
                                            // Only allow alphabets and spaces
                                            const validName = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                                            setNewCustomer({ ...newCustomer, name: validName });
                                        }}
                                        placeholder="John Doe"
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="email" className="text-right">Email</Label>
                                    <Input
                                        id="email"
                                        value={newCustomer.email}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                        placeholder="john@example.com"
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="phone" className="text-right">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={newCustomer.phone}
                                        onChange={(e) => {
                                            // Only allow numbers and +
                                            const validPhone = e.target.value.replace(/[^0-9+]/g, '');
                                            setNewCustomer({ ...newCustomer, phone: validPhone });
                                        }}
                                        placeholder="+1 234 567 8900"
                                        className="col-span-3"
                                    />
                                </div>

                                <div className="border-t pt-4 mt-2">
                                    <p className="text-sm font-medium mb-3">Usage Data (for AI Analysis)</p>

                                    <div className="grid grid-cols-4 items-center gap-4 mb-3">
                                        <Label htmlFor="tickets" className="text-right text-sm">Support Tickets</Label>
                                        <Input
                                            id="tickets"
                                            type="number"
                                            value={newCustomer.support_tickets}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, support_tickets: parseInt(e.target.value) || 0 })}
                                            className="col-span-3"
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4 mb-3">
                                        <Label htmlFor="response" className="text-right text-sm">Avg Response Time (hrs)</Label>
                                        <Input
                                            id="response"
                                            type="number"
                                            value={newCustomer.email_response_time}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, email_response_time: parseFloat(e.target.value) || 0 })}
                                            className="col-span-3"
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4 mb-3">
                                        <Label htmlFor="frequency" className="text-right text-sm">Logins/Week</Label>
                                        <Input
                                            id="frequency"
                                            type="number"
                                            value={newCustomer.usage_frequency}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, usage_frequency: parseFloat(e.target.value) || 0 })}
                                            className="col-span-3"
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="contract" className="text-right text-sm">Contract Value ($)</Label>
                                        <Input
                                            id="contract"
                                            type="number"
                                            value={newCustomer.contract_value}
                                            onChange={(e) => setNewCustomer({ ...newCustomer, contract_value: parseInt(e.target.value) || 0 })}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" onClick={handleAddCustomer} disabled={isAnalyzing}>
                                    {isAnalyzing ? "Analyzing Risk..." : "Save & Analyze"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Health Check</TableHead>
                            <TableHead className="text-right">Last Active</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    Loading customers...
                                </TableCell>
                            </TableRow>
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8">
                                    No customers found. Add your first customer!
                                </TableCell>
                            </TableRow>
                        ) : customers.map((customer) => (
                            <TableRow key={customer.id}>
                                <TableCell className="font-medium">{customer.name}</TableCell>
                                <TableCell>{customer.email}</TableCell>
                                <TableCell>{customer.phone || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={customer.status === 'Active' ? 'default' : customer.status === 'At Risk' ? 'destructive' : 'secondary'}>
                                        {customer.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mr-2 max-w-[100px]">
                                            <div
                                                className={`h-2.5 rounded-full ${customer.healthScore > 80 ? 'bg-emerald-500' :
                                                    customer.healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${customer.healthScore}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-sm text-muted-foreground">{customer.healthScore}%</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">{customer.lastActive}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedCustomer(customer)}
                                            className="hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" asChild>
                                            <a href={`mailto:${customer.email}`}>
                                                <Mail className="h-4 w-4" />
                                            </a>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => setCallingCustomer({ name: customer.name, phone: customer.phone || '+1234567890' })}
                                        >
                                            <Phone className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <CallingOverlay
                isOpen={!!callingCustomer}
                onClose={() => setCallingCustomer(null)}
                customerName={callingCustomer?.name || ""}
                phoneNumber={callingCustomer?.phone || ""}
            />

            <CustomerDetailsSheet
                customer={selectedCustomer}
                isOpen={!!selectedCustomer}
                onClose={() => setSelectedCustomer(null)}
            />
        </div>
    )
}
