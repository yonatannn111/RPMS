'use client'

import { X } from 'lucide-react'

interface ReplyPreviewProps {
    content: string
    senderName?: string
    onClose: () => void
}

export default function ReplyPreview({ content, senderName, onClose }: ReplyPreviewProps) {
    return (
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border-l-4 border-red-600 flex items-start justify-between">
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Replying to {senderName || 'message'}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate mt-1">
                    {content}
                </p>
            </div>
            <button
                onClick={onClose}
                className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            >
                <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
        </div>
    )
}
