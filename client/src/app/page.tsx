"use client"

import { HealthScoreCard } from "@/components/health-score"
import { ChurnRiskChart } from "@/components/churn-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, AlertTriangle, DollarSign, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { dashboardApi } from "@/services/api"

// Types
interface DashboardStats {
  healthScore: number
  healthTrend: 'up' | 'down' | 'stable'
  activeCustomers: number
  churnRiskCount: number
  revenueAtRisk: number
}

interface StatCard {
  title: string
  icon: React.ComponentType<{ className?: string }>
  value: string | number
  sub: string
  iconColor: string
}

interface Activity {
  name: string
  desc: string
  badge: string
  badgeColor: string
}

// Default data (fallback if API fails)
const DEFAULT_STATS: DashboardStats = {
  healthScore: 85,
  healthTrend: 'up',
  activeCustomers: 1240,
  churnRiskCount: 12,
  revenueAtRisk: 45000
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats>(DEFAULT_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const stats = await dashboardApi.getStats()
      setData({
        healthScore: stats.avgHealthScore || DEFAULT_STATS.healthScore,
        healthTrend: 'up',
        activeCustomers: stats.activeCustomers || DEFAULT_STATS.activeCustomers,
        churnRiskCount: stats.churnRisk || DEFAULT_STATS.churnRiskCount,
        revenueAtRisk: stats.revenueAtRisk || DEFAULT_STATS.revenueAtRisk
      })
      setError(null)
    } catch (err) {
      console.error("Failed to load dashboard data:", err)
      // setError("Using default data - backend not connected")
      // Keep using default data
    } finally {
      setIsLoading(false)
    }
  }

  const stats: StatCard[] = [
    {
      title: "Active Customers",
      icon: Users,
      value: `+${data.activeCustomers.toLocaleString()}`,
      sub: "+180 from last month",
      iconColor: "text-muted-foreground"
    },
    {
      title: "Churn Risk",
      icon: AlertTriangle,
      value: data.churnRiskCount,
      sub: "Customers at high risk",
      iconColor: "text-rose-500"
    },
    {
      title: "Revenue at Risk",
      icon: DollarSign,
      value: `$${data.revenueAtRisk.toLocaleString()}`,
      sub: "Potential loss",
      iconColor: "text-muted-foreground"
    }
  ]

  const recentActivity: Activity[] = [
    {
      name: "Customer X",
      desc: "High churn risk detected (78%)",
      badge: "Criteria Met",
      badgeColor: "text-rose-500"
    },
    {
      name: "Customer Y",
      desc: "Sentiment dropped to negative",
      badge: "Warning",
      badgeColor: "text-orange-500"
    }
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your customer health and sales performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <HealthScoreCard score={data.healthScore} trend={data.healthTrend} />

        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <ChurnRiskChart />

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center border">
                    {activity.name.charAt(0)}
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {activity.desc}
                    </p>
                  </div>
                  <div className={`ml-auto font-medium ${activity.badgeColor}`}>
                    {activity.badge}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
