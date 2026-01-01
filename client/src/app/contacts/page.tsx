"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Mail, Phone, User } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

interface Contact {
    id: string
    customer_id: string
    name: string
    email?: string
    phone?: string
    title?: string
    is_primary: boolean
    created_at: string
}

export default function ContactsPage() {
    const { token } = useAuth()
    const [contacts, setContacts] = useState<Contact[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [newContact, setNewContact] = useState({
        customer_id: '',
        name: '',
        email: '',
        phone: '',
        title: '',
        is_primary: false
    })

    useEffect(() => {
        loadContacts()
    }, [search])

    const loadContacts = async () => {
        try {
            setIsLoading(true)
            const response = await axios.get(`${API_URL}/contacts`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { search }
            })
            setContacts(response.data)
        } catch (error) {
            console.error('Failed to load contacts:', error)
            toast.error('Failed to load contacts')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateContact = async () => {
        if (!newContact.name || !newContact.customer_id) {
            toast.error('Name and Customer ID are required')
            return
        }

        try {
            await axios.post(`${API_URL}/contacts`, newContact, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success('Contact created successfully')
            setIsOpen(false)
            setNewContact({
                customer_id: '',
                name: '',
                email: '',
                phone: '',
                title: '',
                is_primary: false
            })
            loadContacts()
        } catch (error) {
            console.error('Failed to create contact:', error)
            toast.error('Failed to create contact')
        }
    }

    const handleDeleteContact = async (id: string) => {
        if (!confirm('Are you sure you want to delete this contact?')) return

        try {
            await axios.delete(`${API_URL}/contacts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success('Contact deleted successfully')
            loadContacts()
        } catch (error) {
            console.error('Failed to delete contact:', error)
            toast.error('Failed to delete contact')
        }
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Contacts</h2>
                    <p className="text-muted-foreground">
                        Manage customer contacts and relationships
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Contact
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Contact</DialogTitle>
                            <DialogDescription>
                                Add a new contact for a customer
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="customer_id">Customer ID *</Label>
                                <Input
                                    id="customer_id"
                                    value={newContact.customer_id}
                                    onChange={(e) => setNewContact({ ...newContact, customer_id: e.target.value })}
                                    placeholder="UUID of customer"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                    placeholder="+1-555-0123"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={newContact.title}
                                    onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                                    placeholder="CTO"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateContact}>Create Contact</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                        placeholder="Search contacts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Contacts ({contacts.length})</CardTitle>
                    <CardDescription>
                        View and manage all customer contacts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading contacts...
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No contacts found. Create your first contact!
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                {contact.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {contact.email ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    {contact.email}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {contact.phone ? (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    {contact.phone}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{contact.title || '-'}</TableCell>
                                        <TableCell>
                                            {contact.is_primary && (
                                                <Badge variant="default">Primary</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteContact(contact.id)}
                                            >
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
