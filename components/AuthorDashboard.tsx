'use client'

import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { User, Paper, createPaper, getPapers } from '@/lib/api'
import Header from './Header'

interface AuthorDashboardProps {
  user: User
  onLogout: () => void
}

export default function AuthorDashboard({ user, onLogout }: AuthorDashboardProps) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [notifications, setNotifications] = useState<Array<{ id: number, message: string, timestamp: string }>>([])
  const [showSubmissionForm, setShowSubmissionForm] = useState(false)
  const [newPaper, setNewPaper] = useState({ title: '', abstract: '', content: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPapers()
  }, [])

  const fetchPapers = async () => {
    try {
      const result = await getPapers()
      if (result.success && result.data) {
        // Filter papers for current author
        const authorPapers = result.data.filter((paper: any) =>
          paper.author_id === user.id
        )
        setPapers(authorPapers)
      }
    } catch (error) {
      console.error('Failed to fetch papers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitPaper = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPaper.title && newPaper.abstract) {
      try {
        const paperData = {
          title: newPaper.title,
          abstract: newPaper.abstract,
          content: newPaper.content,
          author_id: user.id,
          status: 'draft' as const
        }

        const result = await createPaper(paperData)
        if (result.success && result.data) {
          setPapers([result.data, ...papers])
          setNotifications([{
            id: notifications.length + 1,
            message: `Paper "${newPaper.title}" created successfully`,
            timestamp: new Date().toLocaleString()
          }, ...notifications])
          setNewPaper({ title: '', abstract: '', content: '' })
          setShowSubmissionForm(false)
        }
      } catch (error) {
        console.error('Failed to create paper:', error)
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'under_review': return 'bg-yellow-100 text-yellow-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'published': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={user} title="Author Dashboard" onLogout={onLogout} />

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-red-600">My Papers</h2>
              <button
                onClick={() => setShowSubmissionForm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Submit New Paper
              </button>
            </div>
            <div className="p-6">
              {papers.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No papers submitted yet</p>
                  <button
                    onClick={() => setShowSubmissionForm(true)}
                    className="mt-4 text-red-600 hover:text-red-700 font-medium"
                  >
                    Submit your first paper
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {papers.map(paper => (
                    <div key={paper.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold dark:text-white">{paper.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Created: {new Date(paper.created_at).toLocaleDateString()}</p>
                          {paper.abstract && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">{paper.abstract}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(paper.status)}`}>
                          {formatStatus(paper.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showSubmissionForm && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold text-red-600">Submit New Paper</h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmitPaper} className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Paper Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={newPaper.title}
                      onChange={(e) => setNewPaper({ ...newPaper, title: e.target.value })}
                      placeholder="Enter paper title"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="abstract" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Abstract
                    </label>
                    <textarea
                      id="abstract"
                      value={newPaper.abstract}
                      onChange={(e) => setNewPaper({ ...newPaper, abstract: e.target.value })}
                      placeholder="Enter paper abstract"
                      rows={4}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content
                    </label>
                    <textarea
                      id="content"
                      value={newPaper.content}
                      onChange={(e) => setNewPaper({ ...newPaper, content: e.target.value })}
                      placeholder="Enter paper content"
                      rows={8}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Create Paper
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSubmissionForm(false)}
                      className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-red-600">Notifications</h2>
            </div>
            <div className="p-6">
              {notifications.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No notifications</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notification => (
                    <div key={notification.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 rounded-lg">
                      <p className="text-sm dark:text-yellow-100">{notification.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.timestamp}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
