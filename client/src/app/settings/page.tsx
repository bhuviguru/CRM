"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save } from "lucide-react"
import { defaultUserSettings } from "@/lib/mock-data"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { Pencil, X } from "lucide-react"

export default function SettingsPage() {
    const { user } = useAuth()
    const [isEditing, setIsEditing] = useState(false)

    // Initialize with blank or real user data
    const [data, setData] = useState({
        ...defaultUserSettings, // Keep other defaults like notifications
        name: user?.name || "",
        email: user?.email || ""
    })

    // Update state when user loads (if page loaded before auth)
    useEffect(() => {
        if (user) {
            setData(prev => ({
                ...prev,
                name: user.name,
                email: user.email
            }))
        }
    }, [user])

    const handleSave = () => {
        setIsEditing(false)
        alert("Settings saved!")
    }

    const handleCancel = () => {
        setIsEditing(false)
        if (user) {
            setData(prev => ({ ...prev, name: user.name, email: user.email }))
        } else {
            setData(prev => ({ ...prev, name: "", email: "" }))
        }
    }
    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>

            <div className="grid gap-8">
                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">Profile Information</h3>
                        {!isEditing && (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                    <div className="grid gap-4 max-w-sm">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={data.name}
                                disabled={!isEditing}
                                onChange={(e) => setData({ ...data, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                value={data.email}
                                disabled={!isEditing}
                                onChange={(e) => setData({ ...data, email: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                    <h3 className="text-lg font-medium mb-4">Notifications</h3>
                    <div className="flex items-center space-x-2">
                        <input type="checkbox" id="churn" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" defaultChecked />
                        <label htmlFor="churn" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Email me when high churn risk is detected
                        </label>
                    </div>
                </div>

                <div>
                    {isEditing && (
                        <div className="flex gap-4">
                            <Button onClick={handleSave}>
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                            <Button variant="outline" onClick={handleCancel}>
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
