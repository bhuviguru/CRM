"use client"

import { Home, Users, Settings, Activity, BarChart3, ShieldAlert, CheckSquare, LogOut, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const routes = [
    {
        label: "Dashboard",
        icon: Home,
        href: "/",
        color: "text-sky-500",
    },
    {
        label: "Customers",
        icon: Users,
        href: "/customers",
        color: "text-violet-500",
    },
    {
        label: "Churn Risk",
        icon: ShieldAlert,
        href: "/churn-risk",
        color: "text-pink-700",
    },
    {
        label: "Tasks",
        icon: CheckSquare,
        href: "/tasks",
        color: "text-green-500",
    },
    {
        label: "Analytics",
        icon: BarChart3,
        href: "/analytics",
        color: "text-orange-700",
    },
    {
        label: "Settings",
        icon: Settings,
        href: "/settings",
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const { user, logout } = useAuth()

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white w-64">
            <div className="px-3 py-2 flex-1">
                <Link href="/" className="flex items-center pl-3 mb-14">
                    <Activity className="h-8 w-8 mr-4 text-emerald-500" />
                    <h1 className="text-2xl font-bold">
                        Sahayak<span className="text-emerald-500">CRM</span>
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* User Profile Footer */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-white/10 transition-colors">

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {user?.name || 'User'}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">
                            {user?.email || ''}
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-white/5 rounded-full transition-all"
                        title="Log Out"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
