'use client'

import { useState, useEffect } from 'react'
import { User, getUnreadCount } from '@/lib/api'
import { User as UserIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface HeaderProps {
    user: User
    title: string
    onLogout: () => void
}

export default function Header({ user, title, onLogout }: HeaderProps) {
    const router = useRouter()
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        // Fetch unread count initially
        fetchUnreadCount()

        // Poll every 10 seconds
        const interval = setInterval(fetchUnreadCount, 10000)
        return () => clearInterval(interval)
    }, [])

    const fetchUnreadCount = async () => {
        try {
            const result = await getUnreadCount()
            if (result.success && result.data) {
                setUnreadCount(result.data.count)
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error)
        }
    }

    return (
        <header className="bg-white dark:bg-gray-800 shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.push('/chat')}
                        className="relative text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Messages"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => router.push('/profile')}
                        className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-300 dark:border-gray-600">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                            ) : (
                                <UserIcon className="h-5 w-5 text-gray-500" />
                            )}
                        </div>
                        <span className="font-medium hidden sm:block">{user.name}</span>
                    </button>
                    <button
                        onClick={onLogout}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </header>
    )
}
