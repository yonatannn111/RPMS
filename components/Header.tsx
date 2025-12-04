'use client'

import { User } from '@/lib/api'
import { User as UserIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface HeaderProps {
    user: User
    title: string
    onLogout: () => void
}

export default function Header({ user, title, onLogout }: HeaderProps) {
    const router = useRouter()

    return (
        <header className="bg-white dark:bg-gray-800 shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => router.push('/chat')}
                        className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Messages"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
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
