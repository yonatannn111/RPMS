'use client'

import { useState } from 'react'
import { Contact } from '@/lib/api'
import { X, Search, Send } from 'lucide-react'

interface ForwardModalProps {
    isOpen: boolean
    onClose: () => void
    contacts: Contact[]
    onForward: (contactIds: string[]) => void
    messageContent: string
}

export default function ForwardModal({ isOpen, onClose, contacts, onForward, messageContent }: ForwardModalProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])

    if (!isOpen) return null

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleContact = (contactId: string) => {
        setSelectedContactIds(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        )
    }

    const handleForward = () => {
        if (selectedContactIds.length > 0) {
            onForward(selectedContactIds)
            onClose()
            setSelectedContactIds([])
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Forward Message</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic truncate">
                        "{messageContent}"
                    </p>
                </div>

                <div className="p-4">
                    <div className="relative mb-4">
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                        {filteredContacts.map(contact => {
                            const isSelected = selectedContactIds.includes(contact.id)
                            return (
                                <div
                                    key={contact.id}
                                    onClick={() => toggleContact(contact.id)}
                                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected
                                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${isSelected
                                            ? 'bg-red-600 border-red-600'
                                            : 'border-gray-300 dark:border-gray-500'
                                        }`}>
                                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold mr-3">
                                        {contact.avatar ? (
                                            <img src={contact.avatar} alt={contact.name} className="h-full w-full rounded-full object-cover" />
                                        ) : (
                                            contact.name.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{contact.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{contact.role}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="p-4 border-t dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="mr-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleForward}
                        disabled={selectedContactIds.length === 0}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="h-4 w-4 mr-2" />
                        Send {selectedContactIds.length > 0 && `(${selectedContactIds.length})`}
                    </button>
                </div>
            </div>
        </div>
    )
}
