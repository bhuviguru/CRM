"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, Filter } from "lucide-react"
import { taskApi } from "@/services/api"
import toast from "react-hot-toast"

// Types
interface Task {
    id: string
    customer_id?: string
    account_name?: string
    title: string
    description?: string
    assigned_to?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    status: 'open' | 'in_progress' | 'completed' | 'cancelled'
    due_date?: string
    created_at: string
    updated_at?: string
}

interface NewTaskForm {
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    due_date: string
}

interface GroupedTasks {
    open: Task[]
    in_progress: Task[]
    completed: Task[]
}

const INITIAL_TASK_FORM: NewTaskForm = {
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
}

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [filter, setFilter] = useState<string>('all')
    const [newTask, setNewTask] = useState<NewTaskForm>(INITIAL_TASK_FORM)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        loadTasks()
    }, [filter])

    const loadTasks = async () => {
        try {
            setIsLoading(true)
            const data = await taskApi.getAll()
            setTasks(Array.isArray(data) ? data : (Array.isArray((data as any).data) ? (data as any).data : []))
        } catch (error) {
            console.error('Failed to load tasks:', error)
            toast.error('Failed to load tasks')
            setTasks([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateTask = async () => {
        // Frontend validation
        if (!newTask.title.trim()) {
            toast.error('Title is required')
            return
        }

        // Validate priority
        const validPriorities: Array<Task['priority']> = ['low', 'medium', 'high', 'urgent']
        if (!validPriorities.includes(newTask.priority)) {
            toast.error('Invalid priority selected')
            return
        }

        // Validate date if provided
        if (newTask.due_date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/
            if (!dateRegex.test(newTask.due_date)) {
                toast.error('Due date must be in YYYY-MM-DD format')
                return
            }
        }

        try {
            // Prepare backend-safe payload
            const taskPayload = {
                title: newTask.title.trim(),
                description: newTask.description.trim() || undefined,
                priority: newTask.priority.toLowerCase() as Task['priority'], // Normalize to lowercase
                due_date: newTask.due_date || undefined, // Send as YYYY-MM-DD or undefined
                status: 'open' as const,
                created_by: 'admin', // TODO: Replace with actual user ID from auth context
                assigned_to: 'admin' // TODO: Replace with actual assignment logic
            }

            await taskApi.create(taskPayload)

            toast.success('Task created successfully')
            setIsOpen(false)
            setNewTask(INITIAL_TASK_FORM)
            await loadTasks()
        } catch (error) {
            console.error('Failed to create task:', error)

            // Extract error message if available
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to create task. Please try again.'

            toast.error(errorMessage)
        }
    }

    const handleUpdateStatus = async (taskId: string, newStatus: Task['status']) => {
        try {
            await taskApi.update(taskId, { status: newStatus })
            toast.success('Task updated')
            await loadTasks()
        } catch (error) {
            console.error('Failed to update task:', error)
            toast.error('Failed to update task')
        }
    }

    const getPriorityColor = (priority: Task['priority']): "destructive" | "default" | "secondary" => {
        switch (priority) {
            case 'urgent':
            case 'high':
                return 'destructive'
            case 'medium':
                return 'default'
            case 'low':
                return 'secondary'
            default:
                return 'default'
        }
    }

    const getStatusIcon = (status: Task['status']) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />
            case 'in_progress':
                return <Clock className="h-4 w-4 text-blue-500" />
            case 'open':
                return <Circle className="h-4 w-4 text-gray-500" />
            default:
                return <AlertCircle className="h-4 w-4 text-yellow-500" />
        }
    }

    const groupedTasks: GroupedTasks = {
        open: tasks.filter(t => t.status?.toLowerCase() === 'open'),
        in_progress: tasks.filter(t => t.status?.toLowerCase() === 'in_progress' || t.status?.toLowerCase() === 'in progress'),
        completed: tasks.filter(t => t.status?.toLowerCase() === 'completed')
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto h-[calc(100vh-80px)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
                    <p className="text-muted-foreground">
                        Manage and track customer success tasks
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tasks</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                New Task
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Task</DialogTitle>
                                <DialogDescription>
                                    Add a new task to track customer success activities
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                        placeholder="Follow up with customer"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={newTask.description}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                        placeholder="Details about the task..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <Select
                                            value={newTask.priority}
                                            onValueChange={(v: Task['priority']) => setNewTask({ ...newTask, priority: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="due_date">Due Date</Label>
                                        <Input
                                            id="due_date"
                                            type="date"
                                            value={newTask.due_date}
                                            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateTask}>Create Task</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Kanban Board */}
            {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                    Loading tasks...
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                    {/* Open Column */}
                    <div className="flex flex-col bg-muted/50 rounded-lg p-4 h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Circle className="h-5 w-5 text-gray-500" />
                                Open <Badge variant="secondary" className="ml-2">{groupedTasks.open.length}</Badge>
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {groupedTasks.open.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                                    No open tasks
                                </p>
                            ) : (
                                groupedTasks.open.map((task) => (
                                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-all shadow-sm border-l-4 border-l-gray-300">
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-medium text-sm line-clamp-2 leading-tight">{task.title}</h4>
                                                <Badge variant={getPriorityColor(task.priority)} className="text-[10px] h-5 px-1.5 ml-2 shrink-0">
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                            {task.description && (
                                                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                                    {task.description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                                <span className="text-[10px] text-muted-foreground">
                                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-7 text-xs"
                                                    onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                                                >
                                                    Start
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* In Progress Column */}
                    <div className="flex flex-col bg-muted/50 rounded-lg p-4 h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-500" />
                                In Progress <Badge variant="secondary" className="ml-2">{groupedTasks.in_progress.length}</Badge>
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {groupedTasks.in_progress.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                                    No active tasks
                                </p>
                            ) : (
                                groupedTasks.in_progress.map((task) => (
                                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-all shadow-sm border-l-4 border-l-blue-500">
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-medium text-sm line-clamp-2 leading-tight">{task.title}</h4>
                                                <Badge variant={getPriorityColor(task.priority)} className="text-[10px] h-5 px-1.5 ml-2 shrink-0">
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t">
                                                <span className="text-[10px] text-muted-foreground">
                                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                                                    onClick={() => handleUpdateStatus(task.id, 'completed')}
                                                >
                                                    Complete
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Completed Column */}
                    <div className="flex flex-col bg-muted/50 rounded-lg p-4 h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                Completed <Badge variant="secondary" className="ml-2">{groupedTasks.completed.length}</Badge>
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {groupedTasks.completed.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                                    No completed tasks
                                </p>
                            ) : (
                                groupedTasks.completed.map((task) => (
                                    <Card key={task.id} className="opacity-75 bg-gray-50 dark:bg-gray-800/50">
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-medium text-sm line-through text-muted-foreground leading-tight">{task.title}</h4>
                                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 ml-2 shrink-0">
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-end mt-2">
                                                <span className="text-[10px] text-green-600 font-medium flex items-center">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
