"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { api } from "@/services/api"

export function ChurnRiskChart() {
    const [chartData, setChartData] = useState<{ name: string; churn: number }[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await api.dashboard.getChurnRisk()
                setChartData(data)
            } catch (error) {
                console.error("Failed to load churn chart:", error)
                // Use empty data or mock as fallback if needed, but better to show empty
                setChartData([])
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [])

    if (isLoading) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Churn Risk Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Highest Churn Risk Customers</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                {chartData.length === 0 ? (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                        No churn risk data available
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={chartData}>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                                angle={-15}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}%`}
                                width={40}
                                domain={[0, 100]}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: 'none', color: '#000' }}
                            />
                            <Bar dataKey="churn" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
