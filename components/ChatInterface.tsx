'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { User, Contact, Message, getContacts, getMessages, sendMessage, uploadChatFile } from '@/lib/api'
import { Send, Search, MessageSquare, Paperclip, X, Reply, Forward, Menu } from 'lucide-react'
import MessageAttachment from './MessageAttachment'
import ReplyPreview from './ReplyPreview'
import ForwardModal from './ForwardModal'
import Image from 'next/image'

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
    const messageInputRef = useRef<HTMLInputElement>(null)
    const prevMessagesLengthRef = useRef(0)

    const searchParams = useSearchParams()
    const initialUserId = searchParams.get('userId')
    const initialMessage = searchParams.get('message')

    // Attachment state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadedFileData, setUploadedFileData] = useState<{ url: string, name: string, type: string, size: number } | null>(null)

    // Reply state
    const [replyingTo, setReplyingTo] = useState<Message | null>(null)

    // Forward state
    const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false)

    // Mobile sidebar state
    const [showSidebar, setShowSidebar] = useState(true)

    // Fetch contacts on mount
    useEffect(() => {
        fetchContacts()
        // Poll for contact updates (unread counts) every 10 seconds
        const interval = setInterval(fetchContacts, 10000)
        return () => clearInterval(interval)
    }, [])

    // Handle initial contact selection and message from query params
    useEffect(() => {
        if (contacts.length > 0 && initialUserId) {
            const contact = contacts.find(c => c.id === initialUserId)
            if (contact) {
                setSelectedContact(contact)
                if (initialMessage) {
                    setNewMessage(decodeURIComponent(initialMessage))
                }
            }
        }
    }, [contacts, initialUserId, initialMessage])

    // Fetch messages when contact is selected
    useEffect(() => {
        if (selectedContact) {
            prevMessagesLengthRef.current = 0
            fetchMessages(selectedContact.id)
            // Poll for new messages every 3 seconds
            const interval = setInterval(() => fetchMessages(selectedContact.id), 3000)
            return () => clearInterval(interval)
        }
    }, [selectedContact])

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current) {
            scrollToBottom()
        }
        prevMessagesLengthRef.current = messages.length
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

            const results = await Promise.all(promises)

            const successes = results.filter(r => r.success).length
            const failures = results.length - successes

            // If forwarding to current chat, update messages list if successful
            if (selectedContact && contactIds.includes(selectedContact.id)) {
                // Check if the specific forward to current contact was successful
                const currentContactIndex = contactIds.indexOf(selectedContact.id)
                if (results[currentContactIndex].success) {
                    fetchMessages(selectedContact.id)
                }
            }

            if (failures === 0) {
                alert(`Message forwarded to ${successes} contact${successes > 1 ? 's' : ''} successfully`)
            } else if (successes === 0) {
                alert('Failed to forward message to any contact')
            } else {
                alert(`Message forwarded to ${successes} contact${successes > 1 ? 's' : ''}. Failed to send to ${failures} contact${failures > 1 ? 's' : ''}.`)
            }
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
        <div className="bg-white dark:bg-gray-800 sm:rounded-lg shadow-lg overflow-hidden h-full flex border-x dark:border-gray-700 w-full max-w-full relative mx-auto">
            <ForwardModal
                isOpen={isForwardModalOpen}
                onClose={() => setIsForwardModalOpen(false)}
                contacts={contacts}
                onForward={handleForwardMessage}
                messageContent={forwardingMessage?.content || (forwardingMessage?.attachment_url ? '[Attachment]' : '')}
            />
            {/* Sidebar - Contact List */}
            <div className={`${showSidebar ? 'block' : 'hidden'} md:block w-full md:w-1/3 border-r dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/50 absolute md:relative z-10 h-full md:h-auto`}>
                <div className="p-3 sm:p-4 border-b dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                                onClick={() => {
                                    setSelectedContact(contact)
                                    setShowSidebar(false) // Hide sidebar on mobile when contact selected
                                }}
                                className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b dark:border-gray-700 ${selectedContact?.id === contact.id ? 'bg-white dark:bg-gray-800 border-l-4 border-l-red-600' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-2 sm:space-x-3">
                                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold overflow-hidden flex-shrink-0">
                                            {contact.avatar ? (
                                                <Image
                                                    src={contact.avatar}
                                                    alt={contact.name}
                                                    width={40}
                                                    height={40}
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            ) : (
                                                contact.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">{contact.name}</h3>
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
                                    <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate pl-10 sm:pl-13">
                                        {contact.last_message.content || (contact.last_message.attachment_url ? '[Attachment]' : '')}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 w-full min-w-0 overflow-x-hidden min-h-0">
                {selectedContact ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 sm:p-4 border-b dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                                {/* Mobile back button */}
                                <button
                                    onClick={() => setShowSidebar(true)}
                                    className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                                >
                                    <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                </button>
                                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold overflow-hidden flex-shrink-0">
                                    {selectedContact.avatar ? (
                                        <Image
                                            src={selectedContact.avatar}
                                            alt={selectedContact.name}
                                            width={40}
                                            height={40}
                                            className="h-full w-full rounded-full object-cover"
                                        />
                                    ) : (
                                        selectedContact.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">{selectedContact.name}</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{selectedContact.role}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-gray-900 overscroll-contain w-full min-h-0">
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
                                        <div key={msg.id} id={`message-${msg.id}`}>
                                            {showDate && (
                                                <div className="text-center my-4">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                                                        {new Date(msg.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group mb-1`}>
                                                <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                                                    {isMe && (
                                                        <div className="flex flex-col sm:flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setReplyingTo(msg)
                                                                    messageInputRef.current?.focus()
                                                                }}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                                                                title="Reply"
                                                            >
                                                                <Reply className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setForwardingMessage(msg)
                                                                    setIsForwardModalOpen(true)
                                                                }}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                                                                title="Forward"
                                                            >
                                                                <Forward className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div
                                                        className={`rounded-2xl p-3 shadow-sm break-words relative max-w-[75%] sm:max-w-[70%] ${isMe
                                                            ? 'bg-red-600 text-white rounded-br-none ml-auto'
                                                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border dark:border-gray-600 rounded-bl-none mr-auto'
                                                            }`}
                                                    >
                                                        {msg.is_forwarded && (
                                                            <p className="text-xs italic opacity-75 mb-1">Forwarded</p>
                                                        )}
                                                        {msg.reply_to_message_id && (() => {
                                                            const repliedMsg = messages.find(m => m.id === msg.reply_to_message_id)
                                                            if (repliedMsg) {
                                                                return (
                                                                    <div className="mb-2 p-2 rounded bg-black/5 dark:bg-white/10 border-l-2 border-red-500 text-xs cursor-pointer" onClick={() => {
                                                                        const el = document.getElementById(`message-${repliedMsg.id}`)
                                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                                    }}>
                                                                        <p className="font-semibold opacity-75">
                                                                            {repliedMsg.sender_id === currentUser.id ? 'You' : (contacts.find(c => c.id === repliedMsg.sender_id)?.name || 'Unknown')}
                                                                        </p>
                                                                        <p className="truncate opacity-75">
                                                                            {repliedMsg.content || (repliedMsg.attachment_url ? '[Attachment]' : '')}
                                                                        </p>
                                                                    </div>
                                                                )
                                                            }
                                                            return null
                                                        })()}
                                                        {msg.content && <p className="text-xs sm:text-sm break-words">{msg.content}</p>}
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
                                                    {!isMe && (
                                                        <div className="flex flex-col sm:flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setReplyingTo(msg)
                                                                    messageInputRef.current?.focus()
                                                                }}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                                                                title="Reply"
                                                            >
                                                                <Reply className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setForwardingMessage(msg)
                                                                    setIsForwardModalOpen(true)
                                                                }}
                                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                                                                title="Forward"
                                                            >
                                                                <Forward className="h-4 w-4" />
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
                        <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 relative z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] w-full">
                            {/* ... previews ... */}
                            {replyingTo && (
                                <ReplyPreview
                                    content={replyingTo.content || '[Attachment]'}
                                    senderName={replyingTo.sender_id === currentUser.id ? 'You' : selectedContact.name}
                                    onClose={() => setReplyingTo(null)}
                                />
                            )}
                            {selectedFile && uploadedFileData && (
                                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Paperclip className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        <span className="text-sm text-gray-800 dark:text-gray-200">{selectedFile.name}</span>
                                    </div>
                                    <button onClick={handleRemoveFile}>
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            <div className="p-2 sm:p-4 w-full">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-full">
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
                                        className="p-2 sm:p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
                                        title="Attach file"
                                    >
                                        <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </button>

                                    {/* Message input */}
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={uploading ? "Uploading..." : "Type a message..."}
                                        disabled={uploading || sending}
                                        ref={messageInputRef}
                                        className="flex-1 p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 min-w-0"
                                    />

                                    {/* Send button */}
                                    <button
                                        type="submit"
                                        disabled={(!newMessage.trim() && !uploadedFileData) || sending || uploading}
                                        className="bg-red-600 text-white p-2 sm:p-3 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
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
