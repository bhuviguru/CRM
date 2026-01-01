import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Mail, Phone, Calendar, Building, CreditCard, Clock, CheckSquare, Settings, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Customer } from "@/types"

interface CustomerDetailsSheetProps {
    customer: Customer | null
    isOpen: boolean
    onClose: () => void
}

export function CustomerDetailsSheet({ customer, isOpen, onClose }: CustomerDetailsSheetProps) {
    const [activities, setActivities] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (isOpen && customer?.id) {
            loadActivity()
        }
    }, [isOpen, customer])

    const loadActivity = async () => {
        if (!customer?.id) return
        setIsLoading(true)
        try {
            const data = await api.customer.getActivity(customer.id)
            setActivities(data)
        } catch (error) {
            console.error("Failed to load activity", error)
        } finally {
            setIsLoading(false)
        }
    }

    if (!customer) return null

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-blue-600 text-white text-xl">
                                {customer.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <SheetTitle className="text-2xl">{customer.name}</SheetTitle>
                            <SheetDescription className="flex items-center gap-2 mt-1">
                                <Badge variant={customer.status === 'Active' ? 'default' : 'secondary'}>
                                    {customer.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{customer.tier} Plan</span>
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="activity">Activity History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-gray-500">Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm">{customer.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm">{customer.phone}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Building className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm">Tech/SaaS Industry</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-gray-500">Subscription & Health</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-medium">Monthly Revenue</span>
                                    </div>
                                    <span className="text-sm font-bold">${customer.mrr?.toLocaleString()}</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Activity className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm font-medium">Health Score</span>
                                        </div>
                                        <span className={`text-sm font-bold ${customer.healthScore > 80 ? 'text-emerald-600' :
                                            customer.healthScore > 50 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>{customer.healthScore}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${customer.healthScore > 80 ? 'bg-emerald-500' :
                                                customer.healthScore > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                            style={{ width: `${customer.healthScore}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="activity">
                        <div className="space-y-6">
                            <h3 className="text-sm font-medium text-muted-foreground mb-4">Recent Timeline</h3>

                            {isLoading ? (
                                <div className="text-center py-8 text-muted-foreground">Loading history...</div>
                            ) : activities.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No recent activity found.</div>
                            ) : (
                                <div className="relative border-l border-gray-200 dark:border-gray-800 ml-3 space-y-8 pb-4">
                                    {activities.map((activity) => (
                                        <div key={activity.id} className="relative pl-8">
                                            <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 ${activity.type === 'task' ? 'bg-blue-500' : 'bg-gray-400'
                                                }`} />
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold">{activity.title}</span>
                                                    {activity.type === 'task' && (
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">Task</Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">{activity.desc}</span>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(activity.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    )
}
