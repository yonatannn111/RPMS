'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Contact, Message, getContacts, getMessages, sendMessage, uploadChatFile } from '@/lib/api'
import { Send, Search, MessageSquare, Paperclip, X, Reply, Forward } from 'lucide-react'
import MessageAttachment from './MessageAttachment'
import ReplyPreview from './ReplyPreview'
import ForwardModal from './ForwardModal'

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
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Attachment state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadedFileData, setUploadedFileData] = useState<{ url: string, name: string, type: string, size: number } | null>(null)

    // Reply state
    const [replyingTo, setReplyingTo] = useState<Message | null>(null)

    // Forward state
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false)

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
            console.log('[ChatInterface] Fetching contacts...')
            const result = await getContacts()
            console.log('[ChatInterface] GetContacts result:', result)
            console.log('[ChatInterface] result.success:', result.success)
            console.log('[ChatInterface] result.data:', result.data)
            console.log('[ChatInterface] Is array?:', Array.isArray(result.data))

            if (result.success && result.data) {
                const contactsArray = Array.isArray(result.data) ? result.data : []
                console.log('[ChatInterface] Setting contacts:', contactsArray)
                setContacts(contactsArray)
            } else {
                console.log('[ChatInterface] No data or not successful')
                setContacts([])
            }
        } catch (error) {
            console.error('[ChatInterface] Failed to fetch contacts:', error)
            setContacts([])
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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB')
            return
        }

        setSelectedFile(file)
        setUploading(true)

        try {
            const result = await uploadChatFile(file)
            if (result.success && result.data) {
                setUploadedFileData(result.data)
            } else {
                alert(result.error || 'Failed to upload file')
                setSelectedFile(null)
            }
        } catch (error) {
            console.error('Upload error:', error)
            alert('Failed to upload file')
            setSelectedFile(null)
        } finally {
            setUploading(false)
        }
    }

    const handleRemoveFile = () => {
        setSelectedFile(null)
        setUploadedFileData(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedContact) return
        if (!newMessage.trim() && !uploadedFileData) return

        setSending(true)
        try {
            const result = await sendMessage(
                selectedContact.id,
                newMessage || '',
                uploadedFileData?.url,
                uploadedFileData?.name,
                uploadedFileData?.type,
                uploadedFileData?.size,
                replyingTo?.id
            )
            if (result.success && result.data) {
                setMessages([...messages, result.data])
                setNewMessage('')
                handleRemoveFile()
                setReplyingTo(null)
                // Update last message in contact list immediately
                setContacts(contacts.map(c =>
                    c.id === selectedContact.id
                        ? { ...c, last_message: { content: result.data!.content || '[Attachment]', created_at: result.data!.created_at } }
                        : c
                ))
            }
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setSending(false)
        }
    }

    const handleForwardMessage = async (contactIds: string[]) => {
        if (!forwardingMessage || contactIds.length === 0) return

        try {
            // Send to all selected contacts
            const promises = contactIds.map(contactId =>
                sendMessage(
                    contactId,
                    forwardingMessage.content,
                    forwardingMessage.attachment_url,
                    forwardingMessage.attachment_name,
                    forwardingMessage.attachment_type,
                    forwardingMessage.attachment_size,
                    undefined, // No reply_to_message_id for forwarded messages
                    true // isForwarded
                )
            )

            await Promise.all(promises)

            // If forwarding to current chat, update messages list
            if (selectedContact && contactIds.includes(selectedContact.id)) {
                // Refresh messages to show the forwarded one
                fetchMessages(selectedContact.id)
            }

            alert(`Message forwarded to ${contactIds.length} contact${contactIds.length > 1 ? 's' : ''} successfully`)
        } catch (error) {
            console.error('Failed to forward message:', error)
            alert('Failed to forward message')
        } finally {
            setForwardingMessage(null)
            setIsForwardModalOpen(false)
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
            <ForwardModal
                isOpen={isForwardModalOpen}
                onClose={() => setIsForwardModalOpen(false)}
                contacts={contacts}
                onForward={handleForwardMessage}
                messageContent={forwardingMessage?.content || (forwardingMessage?.attachment_url ? '[Attachment]' : '')}
            />
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
                                        {contact.last_message.content || (contact.last_message.attachment_url ? '[Attachment]' : '')}
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
                                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                                <div className="flex items-start space-x-2">
                                                    {!isMe && (
                                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => setReplyingTo(msg)}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                                title="Reply"
                                                            >
                                                                <Reply className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setForwardingMessage(msg)
                                                                    setIsForwardModalOpen(true)
                                                                }}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                                title="Forward"
                                                            >
                                                                <Forward className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`max-w-[70%] rounded-lg p-3 ${isMe
                                                            ? 'bg-red-600 text-white rounded-br-none'
                                                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border dark:border-gray-600 rounded-bl-none'
                                                            }`}
                                                    >
                                                        {msg.is_forwarded && (
                                                            <p className="text-xs italic opacity-75 mb-1">Forwarded</p>
                                                        )}
                                                        {msg.content && <p className="text-sm">{msg.content}</p>}
                                                        {msg.attachment_url && (
                                                            <MessageAttachment
                                                                url={msg.attachment_url}
                                                                name={msg.attachment_name || 'file'}
                                                                type={msg.attachment_type || 'application/octet-stream'}
                                                                size={msg.attachment_size}
                                                            />
                                                        )}
                                                        <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-red-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                                            {formatTime(msg.created_at)}
                                                            {isMe && (
                                                                <span className="ml-1">
                                                                    {msg.is_read ? '✓✓' : '✓'}
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    {isMe && (
                                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => setReplyingTo(msg)}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                                title="Reply"
                                                            >
                                                                <Reply className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setForwardingMessage(msg)
                                                                    setIsForwardModalOpen(true)
                                                                }}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                                title="Forward"
                                                            >
                                                                <Forward className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700">
                            {/* Reply Preview */}
                            {replyingTo && (
                                <ReplyPreview
                                    content={replyingTo.content || '[Attachment]'}
                                    senderName={replyingTo.sender_id === currentUser.id ? 'You' : selectedContact.name}
                                    onClose={() => setReplyingTo(null)}
                                />
                            )}

                            {/* File Preview */}
                            {selectedFile && uploadedFileData && (
                                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Paperclip className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        <span className="text-sm text-gray-800 dark:text-gray-200">{selectedFile.name}</span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleRemoveFile}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                                    >
                                        <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                    </button>
                                </div>
                            )}

                            <div className="p-4">
                                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                                    {/* Hidden file input */}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileSelect}
                                        accept="image/*,.pdf,.doc,.docx,.txt"
                                        className="hidden"
                                    />

                                    {/* Attachment button */}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading || sending}
                                        className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                                        title="Attach file"
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </button>

                                    {/* Message input */}
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={uploading ? "Uploading..." : "Type a message..."}
                                        disabled={uploading || sending}
                                        className="flex-1 p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                                    />

                                    {/* Send button */}
                                    <button
                                        type="submit"
                                        disabled={(!newMessage.trim() && !uploadedFileData) || sending || uploading}
                                        className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </form>
                            </div>
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
