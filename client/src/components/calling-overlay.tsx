"use client"

import { useState, useEffect } from "react"
import { Phone, PhoneOff, Mic, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface CallingOverlayProps {
    isOpen: boolean
    onClose: () => void
    customerName: string
    phoneNumber: string | undefined
}

export function CallingOverlay({ isOpen, onClose, customerName, phoneNumber }: CallingOverlayProps) {
    const [status, setStatus] = useState<"dialing" | "connected" | "ended">("dialing")
    const [duration, setDuration] = useState(0)

    useEffect(() => {
        if (isOpen) {
            setStatus("dialing")
            setDuration(0)
            const timer = setTimeout(() => setStatus("connected"), 2500) // Connect after 2.5s
            return () => clearTimeout(timer)
        }
    }, [isOpen])

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (status === "connected") {
            interval = setInterval(() => setDuration((d) => d + 1), 1000)
        }
        return () => clearInterval(interval)
    }, [status])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const handleEndCall = () => {
        setStatus("ended")
        setTimeout(onClose, 1000)
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleEndCall}>
            <DialogContent className="sm:max-w-md bg-gray-950 border-gray-800 text-gray-50 p-0 overflow-hidden shadow-2xl">
                <DialogTitle className="sr-only">Calling {customerName}</DialogTitle>
                <DialogDescription className="sr-only">
                    In-app calling interface showing connection status and timer.
                </DialogDescription>
                <div className="h-[400px] flex flex-col justify-between p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black">
                    {/* Header */}
                    <div className="text-center space-y-4 mt-8">
                        <div className={cn("h-24 w-24 mx-auto rounded-full flex items-center justify-center bg-gray-800 border-4 border-gray-700 shadow-xl",
                            status === "dialing" ? "animate-pulse" : "")}>
                            <span className="text-3xl font-bold text-gray-300">
                                {customerName.charAt(0)}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-semibold tracking-wide">{customerName}</h3>
                            <p className="text-gray-400 font-mono text-sm mt-1">{phoneNumber}</p>
                            <p className={cn("text-sm font-medium mt-2",
                                status === "connected" ? "text-emerald-400" : "text-gray-500 animate-pulse")}>
                                {status === "dialing" ? "Dialing..." : status === "connected" ? formatTime(duration) : "Call Ended"}
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="grid grid-cols-3 gap-6 mb-4">
                        <Button variant="outline" size="icon" className="h-14 w-14 rounded-full bg-gray-800/50 border-gray-700 hover:bg-gray-800 mx-auto">
                            <Mic className="h-6 w-6 text-gray-300" />
                        </Button>
                        <Button variant="destructive" size="icon" className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/50 mx-auto" onClick={handleEndCall}>
                            <PhoneOff className="h-6 w-6 text-white" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-14 w-14 rounded-full bg-gray-800/50 border-gray-700 hover:bg-gray-800 mx-auto">
                            <Video className="h-6 w-6 text-gray-300" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
