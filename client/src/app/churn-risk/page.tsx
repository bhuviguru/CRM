"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, ArrowRight, Mail, Phone } from "lucide-react"
import { RiskCustomer } from "@/types"
import { riskCustomers } from "@/lib/mock-data"
import { CallingOverlay } from "@/components/calling-overlay"
import { useState } from "react"

export default function ChurnRiskPage() {
    const [callingCustomer, setCallingCustomer] = useState<{ name: string, phone: string } | null>(null)
    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-rose-600 flex items-center">
                    <AlertTriangle className="mr-3 h-8 w-8" />
                    Churn Risk Analysis
                </h2>
                <p className="text-muted-foreground">
                    AI-detected high risk customers requiring immediate attention.
                </p>
            </div>

            <div className="grid gap-6">
                {riskCustomers.map((customer) => (
                    <Card key={customer.id} className="border-l-4 border-l-rose-500">
                        <CardHeader className="grid grid-cols-[1fr_110px] items-start gap-4 space-y-0">
                            <div className="space-y-1">
                                <CardTitle>{customer.name}</CardTitle>
                                <CardDescription>{customer.company}</CardDescription>
                            </div>
                            <Badge variant="destructive" className="px-3 py-1 text-lg">
                                {customer.probability}% Risk
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="flex space-x-4 text-sm text-muted-foreground mb-4">
                                <div className="flex items-center">
                                    <AlertTriangle className="mr-1 h-4 w-4 text-orange-500" />
                                    {customer.reason}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" className="hidden h-8 sm:flex" asChild>
                                    <a href={`mailto:${customer.email}`}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email
                                    </a>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="hidden h-8 sm:flex"
                                    onClick={() => setCallingCustomer({ name: customer.name, phone: customer.phone || 'Unknown' })}
                                >
                                    <Phone className="mr-2 h-4 w-4" />
                                    Call
                                </Button>
                                <Button size="sm" className="ml-auto bg-rose-600 hover:bg-rose-700" asChild>
                                    <a href={`mailto:${customer.email}?subject=${encodeURIComponent(customer.action)}&body=Proposing action: ${customer.action}`}>
                                        {customer.action} <ArrowRight className="ml-2 h-4 w-4" />
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <CallingOverlay
                isOpen={!!callingCustomer}
                onClose={() => setCallingCustomer(null)}
                customerName={callingCustomer?.name || ""}
                phoneNumber={callingCustomer?.phone || ""}
            />
        </div >
    )
}
