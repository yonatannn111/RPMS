'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/lib/api'
import { User as UserIcon, Mail, Calendar, Shield, Edit2, Save, X, ArrowLeft } from 'lucide-react'

export default function ProfilePage() {
    const { user, loading, refreshUser } = useAuth()
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        bio: '',
        avatar: '',
    })
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        } else if (user) {
            setFormData({
                name: user.name,
                bio: user.bio || '',
                avatar: user.avatar || '',
            })
        }
    }, [user, loading, router])

    const handleSave = async () => {
        setSaving(true)
        setMessage({ type: '', text: '' })
        try {
            const result = await updateProfile(formData)
            if (result.success) {
                await refreshUser()
                setIsEditing(false)
                setMessage({ type: 'success', text: 'Profile updated successfully' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to update profile' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' })
        } finally {
            setSaving(false)
        }
    }

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.back()}
                                className="text-white hover:bg-red-700 p-2 rounded-full transition-colors"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                            <h1 className="text-2xl font-bold text-white">User Profile</h1>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => router.push('/settings')}
                                className="flex items-center text-red-100 hover:text-white px-4 py-2 rounded-md transition-colors border border-red-400 hover:border-white"
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                Settings
                            </button>
                            {!isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center text-white bg-red-700 hover:bg-red-800 px-4 py-2 rounded-md transition-colors"
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {message.text && (
                            <div className={`p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Avatar Section */}
                            <div className="flex-shrink-0 flex flex-col items-center space-y-4">
                                <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <UserIcon className="h-16 w-16 text-gray-400" />
                                    )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize
                  ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                        user.role === 'editor' ? 'bg-blue-100 text-blue-800' :
                                            user.role === 'coordinator' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-green-100 text-green-800'}`}>
                                    {user.role}
                                </span>
                            </div>

                            {/* Details Section */}
                            <div className="flex-grow space-y-6">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                                            <textarea
                                                rows={4}
                                                value={formData.bio}
                                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                                placeholder="Tell us about yourself..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Avatar URL</label>
                                            <input
                                                type="text"
                                                value={formData.avatar}
                                                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                                                placeholder="https://example.com/avatar.jpg"
                                            />
                                        </div>
                                        <div className="flex justify-end space-x-3 pt-4">
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                            >
                                                <Save className="w-4 h-4 mr-2" />
                                                {saving ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                                            <div className="flex items-center text-gray-500 dark:text-gray-400 mt-1">
                                                <Mail className="w-4 h-4 mr-2" />
                                                {user.email}
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">About</h3>
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {user.bio || 'No bio provided yet.'}
                                            </p>
                                        </div>

                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Calendar className="w-4 h-4 mr-2" />
                                            Joined {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
