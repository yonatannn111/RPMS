'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import AuthorDashboard from '@/components/AuthorDashboard'
import EditorPanel from '@/components/EditorPanel'
import CoordinatorDashboard from '@/components/CoordinatorDashboard'
import AdminPanel from '@/components/AdminPanel'

export default function Home() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center">
        <div className="text-center space-y-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Welcome to RPMS</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">Research Paper Management System</p>
          <div className="space-x-4">
            <Link href="/login" className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 font-medium">
              Login
            </Link>
            <Link href="/signup" className="bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-500 px-6 py-3 rounded-md hover:bg-red-50 dark:hover:bg-gray-700 font-medium">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {user.role === 'author' && <AuthorDashboard user={user} onLogout={logout} />}
      {user.role === 'editor' && <EditorPanel user={user} onLogout={logout} />}
      {user.role === 'coordinator' && <CoordinatorDashboard user={user} onLogout={logout} />}
      {user.role === 'admin' && <AdminPanel user={user} onLogout={logout} />}
    </main>
  )
}
