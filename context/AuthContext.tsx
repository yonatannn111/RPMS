'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, getCurrentUser, signOut as apiSignOut } from '@/lib/api'
import { useRouter } from 'next/navigation'

interface AuthContextType {
    user: User | null
    loading: boolean
    login: (user: User) => void
    logout: () => void
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const refreshUser = async () => {
        try {
            const userData = await getCurrentUser()
            setUser(userData)
        } catch (error) {
            console.error('Failed to fetch user', error)
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Try to get current user on mount
        refreshUser()

        // Fallback: if still loading after 3 seconds, assume backend is down
        const timeout = setTimeout(() => {
            if (loading) {
                console.warn('Backend unavailable - setting loading to false')
                setLoading(false)
            }
        }, 3000)

        return () => clearTimeout(timeout)
    }, [])

    const login = (userData: User) => {
        setUser(userData)
        router.push('/')
    }

    const logout = async () => {
        try {
            await apiSignOut()
            setUser(null)
            router.push('/login')
        } catch (error) {
            console.error('Logout failed', error)
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
