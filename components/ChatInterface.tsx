'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Contact, Message, getContacts, getMessages, sendMessage } from '@/lib/api'
import { Send, Search, MessageSquare } from 'lucide-react'

interface ChatInterfaceProps {
    currentUser: User
}

export default function ChatInterface({ currentUser }: ChatInterfaceProps) {
    const [contacts, setContacts] = useState<Contact[]>([])
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Fetch contacts on mount
    useEffect(() => {
        fetchContacts()
        // Poll for contact updates (unread counts) every 10 seconds
        const interval = setInterval(fetchContacts, 10000)
        return () => clearInterval(interval)
    }, [])

    // Fetch messages when contact is selected
    useEffect(() => {
        if (selectedContact) {
            fetchMessages(selectedContact.id)
            // Poll for new messages every 3 seconds
            const interval = setInterval(() => fetchMessages(selectedContact.id), 3000)
            return () => clearInterval(interval)
        }
    }, [selectedContact])

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const fetchContacts = async () => {
        try {
            const result = await getContacts()
            if (result.success && result.data) {
                setContacts(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch contacts:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchMessages = async (contactId: string) => {
        try {
            const result = await getMessages(contactId)
            if (result.success && result.data) {
                setMessages(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedContact || !newMessage.trim()) return

        setSending(true)
        try {
            const result = await sendMessage(selectedContact.id, newMessage)
            if (result.success && result.data) {
                setMessages([...messages, result.data])
                setNewMessage('')
                // Update last message in contact list immediately
                setContacts(contacts.map(c =>
                    c.id === selectedContact.id
                        ? { ...c, last_message: { content: result.data!.content, created_at: result.data!.created_at } }
                        : c
                ))
            }
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setSending(false)
        }
    }

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.role.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden h-[calc(100vh-120px)] flex border dark:border-gray-700">
            {/* Sidebar - Contact List */}
            <div className="w-1/3 border-r dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/50">
                <div className="p-4 border-b dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filteredContacts.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No contacts found
                        </div>
                    ) : (
                        filteredContacts.map(contact => (
                            <div
                                key={contact.id}
                                onClick={() => setSelectedContact(contact)}
                                className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b dark:border-gray-700 ${selectedContact?.id === contact.id ? 'bg-white dark:bg-gray-800 border-l-4 border-l-red-600' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                                            {contact.avatar ? (
                                                <img src={contact.avatar} alt={contact.name} className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                contact.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900 dark:text-white">{contact.name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{contact.role}</p>
                                        </div>
                                    </div>
                                    {contact.unread_count > 0 && (
                                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                            {contact.unread_count}
                                        </span>
                                    )}
                                </div>
                                {contact.last_message && (
                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 truncate pl-13">
                                        {contact.last_message.content}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
                {selectedContact ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                                    {selectedContact.avatar ? (
                                        <img src={selectedContact.avatar} alt={selectedContact.name} className="h-full w-full rounded-full object-cover" />
                                    ) : (
                                        selectedContact.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-white">{selectedContact.name}</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{selectedContact.role}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                            {messages.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const isMe = msg.sender_id === currentUser.id
                                    const showDate = index === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString()

                                    return (
                                        <div key={msg.id}>
                                            {showDate && (
                                                <div className="text-center my-4">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                                                        {new Date(msg.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[70%] rounded-lg p-3 ${isMe
                                                            ? 'bg-red-600 text-white rounded-br-none'
                                                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border dark:border-gray-600 rounded-bl-none'
                                                        }`}
                                                >
                                                    <p className="text-sm">{msg.content}</p>
                                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {formatTime(msg.created_at)}
                                                        {isMe && (
                                                            <span className="ml-1">
                                                                {msg.is_read ? '✓✓' : '✓'}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending}
                                    className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                        <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium">Select a contact to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    )
}
