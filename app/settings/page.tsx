'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useRouter } from 'next/navigation'
import { changePassword, deleteAccount, updateProfile } from '@/lib/api'
import { Lock, Trash2, Bell, Moon, Sun, Mail } from 'lucide-react'

export default function SettingsPage() {
    const { user, loading, logout, refreshUser } = useAuth()
    const { darkMode, toggleDarkMode } = useTheme()
    const router = useRouter()

    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    })
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })
    const [passwordLoading, setPasswordLoading] = useState(false)

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const [emailNotifications, setEmailNotifications] = useState(false)
    const [preferencesLoading, setPreferencesLoading] = useState(false)
    const [preferencesMessage, setPreferencesMessage] = useState({ type: '', text: '' })

    // Initialize email notifications from user preferences
    useEffect(() => {
        if (user?.preferences?.emailNotifications !== undefined) {
            setEmailNotifications(user.preferences.emailNotifications as boolean)
        }
    }, [user])

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        )
    }

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordMessage({ type: '', text: '' })

        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' })
            return
        }

        if (passwordData.new_password.length < 6) {
            setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' })
            return
        }

        setPasswordLoading(true)
        try {
            const result = await changePassword({
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            })

            if (result.success) {
                setPasswordMessage({ type: 'success', text: 'Password changed successfully' })
                setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
            } else {
                setPasswordMessage({ type: 'error', text: result.error || 'Failed to change password' })
            }
        } catch (error) {
            setPasswordMessage({ type: 'error', text: 'An unexpected error occurred' })
        } finally {
            setPasswordLoading(false)
        }
    }

    const handleDeleteAccount = async () => {
        setDeleteLoading(true)
        try {
            const result = await deleteAccount()
            if (result.success) {
                await logout()
            } else {
                alert(result.error || 'Failed to delete account')
            }
        } catch (error) {
            alert('An unexpected error occurred')
        } finally {
            setDeleteLoading(false)
            setShowDeleteConfirm(false)
        }
    }

    const handleEmailNotificationsToggle = async () => {
        const newValue = !emailNotifications
        setEmailNotifications(newValue)
        setPreferencesLoading(true)
        setPreferencesMessage({ type: '', text: '' })

        try {
            const result = await updateProfile({
                preferences: {
                    ...user?.preferences,
                    emailNotifications: newValue,
                },
            })

            if (result.success) {
                await refreshUser()
                setPreferencesMessage({ type: 'success', text: 'Email notification preference updated' })
                setTimeout(() => setPreferencesMessage({ type: '', text: '' }), 3000)
            } else {
                setPreferencesMessage({ type: 'error', text: result.error || 'Failed to update preference' })
                setEmailNotifications(!newValue) // Revert on error
            }
        } catch (error) {
            setPreferencesMessage({ type: 'error', text: 'An unexpected error occurred' })
            setEmailNotifications(!newValue) // Revert on error
        } finally {
            setPreferencesLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>

                {/* Security Settings */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                            <Lock className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                            Security
                        </h2>
                    </div>
                    <div className="p-6">
                        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                        {passwordMessage.text && (
                            <div className={`mb-4 p-3 rounded text-sm ${passwordMessage.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                {passwordMessage.text}
                            </div>
                        )}
                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.old_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={passwordLoading}
                                className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
                            >
                                {passwordLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Preferences */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                            <Bell className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
                            Preferences
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {preferencesMessage.text && (
                            <div className={`mb-4 p-3 rounded text-sm ${preferencesMessage.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                {preferencesMessage.text}
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                {darkMode ? <Moon className="w-5 h-5 mr-3 text-gray-400" /> : <Sun className="w-5 h-5 mr-3 text-gray-400" />}
                                <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
                            </div>
                            <button
                                onClick={toggleDarkMode}
                                disabled={preferencesLoading}
                                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 ${darkMode ? 'bg-red-600' : 'bg-gray-200'}`}
                            >
                                <span className={`${darkMode ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}></span>
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Mail className="w-5 h-5 mr-3 text-gray-400" />
                                <span className="text-gray-700 dark:text-gray-300">Email Notifications</span>
                            </div>
                            <button
                                onClick={handleEmailNotificationsToggle}
                                disabled={preferencesLoading}
                                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 ${emailNotifications ? 'bg-red-600' : 'bg-gray-200'}`}
                            >
                                <span className={`${emailNotifications ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}></span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-red-200 dark:border-red-800">
                    <div className="px-6 py-4 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                        <h2 className="text-lg font-medium text-red-800 dark:text-red-400 flex items-center">
                            <Trash2 className="w-5 h-5 mr-2" />
                            Danger Zone
                        </h2>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        {!showDeleteConfirm ? (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                            >
                                Delete Account
                            </button>
                        ) : (
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800">
                                <p className="text-sm text-red-800 dark:text-red-400 font-medium mb-3">
                                    Are you sure you want to delete your account? This action cannot be undone.
                                </p>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={handleDeleteAccount}
                                        disabled={deleteLoading}
                                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                                    >
                                        {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
