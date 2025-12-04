'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { updateProfile } from '@/lib/api'

interface ThemeContextType {
    darkMode: boolean
    toggleDarkMode: () => Promise<void>
    loading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user, refreshUser } = useAuth()
    const [darkMode, setDarkMode] = useState(false)
    const [loading, setLoading] = useState(false)

    // Initialize dark mode from user preferences
    useEffect(() => {
        // Only enable dark mode if explicitly set to true in user preferences
        if (user?.preferences?.darkMode === true) {
            setDarkMode(true)
        } else {
            // Default to light mode for all other cases
            setDarkMode(false)
        }
    }, [user])

    // Apply dark mode class to document
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        // Save to localStorage for immediate application on next load
        localStorage.setItem('darkMode', String(darkMode))
    }, [darkMode])

    const toggleDarkMode = async () => {
        const newMode = !darkMode
        setDarkMode(newMode)
        setLoading(true)

        try {
            // Update backend if user is logged in
            if (user) {
                const result = await updateProfile({
                    preferences: {
                        ...user.preferences,
                        darkMode: newMode,
                    },
                })

                if (result.success) {
                    // Refresh user data to sync preferences
                    await refreshUser()
                } else {
                    console.error('Failed to save dark mode preference:', result.error)
                    // Revert on error
                    setDarkMode(!newMode)
                }
            }
        } catch (error) {
            console.error('Error toggling dark mode:', error)
            // Revert on error
            setDarkMode(!newMode)
        } finally {
            setLoading(false)
        }
    }

    return (
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode, loading }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
