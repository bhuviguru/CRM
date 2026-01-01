"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface HealthScoreProps {
    score: number
    trend: 'up' | 'down' | 'stable'
}

export function HealthScoreCard({ score, trend }: HealthScoreProps) {
    const trendConfig = {
        up: { icon: TrendingUp, color: "text-emerald-500", label: "+2.5%" },
        down: { icon: TrendingDown, color: "text-rose-500", label: "-1.2%" },
        stable: { icon: Minus, color: "text-gray-500", label: "0%" },
    }[trend]

    const Icon = trendConfig.icon

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Overall Health Score
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{score}%</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <Icon className={`h-4 w-4 mr-1 ${trendConfig.color}`} />
                    <span className={trendConfig.color}>
                        {trendConfig.label}
                    </span>
                    <span className="ml-1">from last month</span>
                </p>
            </CardContent>
        </Card>
    )
}
