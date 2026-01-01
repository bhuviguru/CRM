"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { NotificationCenter } from "@/components/notification-center"
import { Loader2 } from "lucide-react"

const PUBLIC_ROUTES = ['/login', '/register', '/auth/callback']

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        if (!isLoading) {
            // Check if current route is public
            const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))

            if (isPublicRoute) {
                // If user is already logged in and tries to access login page, redirect to dashboard
                if (user && pathname === '/login') {
                    router.push('/')
                }
                setIsAuthorized(true)
            } else {
                // Protected route verification
                if (!user) {
                    setIsAuthorized(false)
                    router.push('/login')
                } else {
                    setIsAuthorized(true)
                }
            }
        }
    }, [user, isLoading, pathname, router])

    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-gray-500 font-medium animate-pulse">Loading SahayakCRM...</p>
                </div>
            </div>
        )
    }

    // Don't render anything while redirecting
    if (!isAuthorized && !PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        return null
    }

    // Render public pages without layout
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        return <>{children}</>
    }

    // Render protected pages with full layout
    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                <AppSidebar />
            </div>
            <main className="md:pl-72 bg-gray-50 dark:bg-gray-900 min-h-screen">
                {/* Header with Notification Bell */}
                <div className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-3 flex items-center justify-between shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">SahayakCRM Pro</h2>
                    <div className="flex items-center gap-4">
                        <NotificationCenter />
                        <div className="flex items-center gap-3 border-l pl-4 ml-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.name}</p>
                                <p className="text-xs text-gray-500">{user?.role}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
                {children}
            </main>
        </div>
    )
}
