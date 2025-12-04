'use client'

import Image from 'next/image'
import { Download, FileText, Image as ImageIcon, FileIcon } from 'lucide-react'

interface MessageAttachmentProps {
    url: string
    name: string
    type: string
    size?: number
}

export default function MessageAttachment({ url, name, type, size }: MessageAttachmentProps) {
    const isImage = type.startsWith('image/')
    const isPDF = type === 'application/pdf'

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return ''
        const kb = bytes / 1024
        if (kb < 1024) return `${kb.toFixed(1)} KB`
        return `${(kb / 1024).toFixed(1)} MB`
    }

    if (isImage) {
        return (
            <div className="mt-2 max-w-sm">
                <a href={url} target="_blank" rel="noopener noreferrer">
                    <Image
                        src={url}
                        alt={name}
                        width={400}
                        height={256}
                        className="rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    />
                </a>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{name}</p>
            </div>
        )
    }

    return (
        <div className="mt-2 flex items-center space-x-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg max-w-xs">
            <div className="flex-shrink-0">
                {isPDF ? (
                    <FileText className="h-8 w-8 text-red-600" />
                ) : (
                    <FileIcon className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</p>
                {size && <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(size)}</p>}
            </div>
            <a
                href={url}
                download={name}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
            >
                <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </a>
        </div>
    )
}
