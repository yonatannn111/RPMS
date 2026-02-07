'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Notification, getUnreadCount, getNotifications, markNotificationRead } from '@/lib/api'
import { User as UserIcon, Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface HeaderProps {
    user: User
    title: string
    onLogout: () => void
}

export default function Header({ user, title, onLogout }: HeaderProps) {
    const router = useRouter()
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showNotifications, setShowNotifications] = useState(false)
    const notificationRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Fetch unread count and notifications initially
        fetchUnreadCount()
        fetchNotifications()

        // Poll every 10 seconds
        const interval = setInterval(() => {
            fetchUnreadCount()
            fetchNotifications()
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
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

    const fetchNotifications = async () => {
        try {
            const result = await getNotifications()
            if (result.success && result.data) {
                setNotifications(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        }
    }

    const handleNotificationClick = async (notification: Notification) => {
        console.log('[Header] Notification clicked:', notification)

        // Mark as read if not already
        if (!notification.is_read) {
            console.log('[Header] Marking notification as read:', notification.id)
            const result = await markNotificationRead(notification.id)
            if (result.success) {
                // Update local state immediately
                setNotifications(prev => prev.map(n =>
                    n.id === notification.id ? { ...n, is_read: true } : n
                ))
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        }

        // Navigate to dashboard page if there's a paper ID
        if (notification.paper_id) {
            setShowNotifications(false)

            const targetPath = '/dashboard'

            // If we're already on the dashboard, we need to force the hash change event
            if (window.location.pathname === targetPath) {
                // First clear the hash if it matches (to ensure change event fires)
                if (window.location.hash === `#paper-${notification.paper_id}`) {
                    window.location.hash = ''
                }

                // Small timeout to ensure browser registers the change between clear and set
                setTimeout(() => {
                    window.location.hash = `paper-${notification.paper_id}`
                }, 10)
            } else {
                // Navigate to the page with the hash
                router.push(`${targetPath}#paper-${notification.paper_id}`)
            }
        }
    }

    const unreadNotificationCount = notifications.filter(n => !n.is_read).length

    return (
        <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-50 w-full overflow-hidden">
            <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate mr-2">{title}</h1>
                <div className="flex items-center space-x-1 sm:space-x-4">
                    <button
                        onClick={() => router.push('/chat')}
                        className="relative text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2"
                        title="Messages"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-6 sm:h-6"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <div ref={notificationRef} className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="relative text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2"
                            title="Notifications"
                        >
                            <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                            {unreadNotificationCount > 0 && (
                                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                </span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className="fixed sm:absolute left-0 sm:left-auto right-0 mt-2 mx-auto sm:mx-0 w-[calc(100vw-1rem)] sm:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto top-16 sm:top-auto">
                                <div className="p-3 sm:p-4 border-b dark:border-gray-700">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {unreadNotificationCount} unread, {notifications.length - unreadNotificationCount} read
                                    </p>
                                </div>
                                <div className="divide-y dark:divide-gray-700">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.map(notification => (
                                            <div
                                                key={notification.id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`p-3 transition-colors ${notification.paper_id ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''
                                                    } ${!notification.is_read ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
                                                    }`}
                                            >
                                                <p className="text-sm text-gray-900 dark:text-gray-100">{notification.message}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {new Date(notification.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => router.push('/profile')}
                        className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-300 dark:border-gray-600">
                            {user.avatar ? (
                                <Image
                                    src={user.avatar}
                                    alt={user.name}
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <UserIcon className="h-5 w-5 text-gray-500" />
                            )}
                        </div>
                        <span className="hidden sm:inline font-medium text-sm md:text-base">{user.name || 'User'}</span>
                    </button>
                    <button
                        onClick={onLogout}
                        className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium whitespace-nowrap pl-1"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </header>
    )
}
