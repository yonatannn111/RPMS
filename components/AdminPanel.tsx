'use client'

import { useState, useEffect } from 'react'
import { Users, MessageSquare, Send, X, FileText, Download, Bell, CheckCircle, AlertCircle, Plus, Shield } from 'lucide-react'
import { User, Paper, Review, Notification, getPapers, getReviews, updatePaper, sendMessage, uploadFile, getNotifications, markNotificationRead, createAdminUser, getAdminStaff } from '@/lib/api'
import Header from './Header'

interface AdminPanelProps {
  user: User
  onLogout: () => void
}

interface PaperWithReviews extends Paper {
  reviews: Review[]
}

interface StaffMember {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  is_verified: boolean
}

export default function AdminPanel({ user, onLogout }: AdminPanelProps) {
  const [papers, setPapers] = useState<PaperWithReviews[]>([])
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedPaper, setSelectedPaper] = useState<PaperWithReviews | null>(null)
  const [editorContactForm, setEditorContactForm] = useState({ paperId: '', message: '' })
  const [selectedAuthor, setSelectedAuthor] = useState<Paper | null>(null)
  const [showAuthorModal, setShowAuthorModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'reviewed' | 'validated' | 'staff'>('reviewed')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Staff Management State
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [newStaffForm, setNewStaffForm] = useState({ name: '', email: '', password: '', role: 'editor' })
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [showStaffModal, setShowStaffModal] = useState(false)

  const showStatus = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message)
      setErrorMessage(null)
    } else {
      setErrorMessage(message)
      setSuccessMessage(null)
    }
    setTimeout(() => {
      setSuccessMessage(null)
      setErrorMessage(null)
    }, 5000)
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [activeTab])

  // Handle hash navigation for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash && hash.startsWith('#paper-')) {
        const paperId = hash.replace('#paper-', '')

        // Find the paper
        const paper = papers.find(p => p.id === paperId)
        if (paper) {
          // Find which tab the paper belongs to
          const isPending = paper.status === 'submitted' || paper.status === 'recommended_for_publication' || (paper.status === 'under_review' && paper.reviews.length > 0)
          const isValidated = paper.pi_name || paper.institution_code

          if (isPending) setActiveTab('reviewed')
          else if (isValidated) setActiveTab('validated')

          // Open the paper details
          setSelectedPaper(paper)

          // Clear hash so it doesn't re-trigger on polling
          window.history.replaceState(null, '', window.location.pathname + window.location.search)

          // Wait for tab switch and render
          setTimeout(() => {
            const element = document.getElementById(`paper-${paperId}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              element.classList.add('ring-4', 'ring-red-500', 'ring-offset-2', 'rounded-lg')
              setTimeout(() => element.classList.remove('ring-4', 'ring-red-500', 'ring-offset-2'), 5000)
            }
          }, 300)
        }
      }
    }

    // Check on mount and when papers load
    if (!loading && papers.length > 0) {
      handleHashChange()
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [loading, papers])

  const fetchData = async () => {
    try {
      const papersResult = await getPapers()
      const reviewsResult = await getReviews()

      if (papersResult.success && papersResult.data) {
        // Get all papers with their reviews
        const papersWithReviews = papersResult.data.map((paper: Paper) => {
          const paperReviews = reviewsResult.data?.filter((review: Review) =>
            review.paper_id === paper.id
          ) || []

          return {
            ...paper,
            reviews: paperReviews
          }
        })

        setPapers(papersWithReviews)
      }

      const notificationsResult = await getNotifications()
      if (notificationsResult.success && notificationsResult.data) {
        setNotifications(notificationsResult.data)
      }

      // Fetch Staff
      if (activeTab === 'staff') {
        const staffResult = await getAdminStaff()
        if (staffResult.success && staffResult.data) {
          setStaff(staffResult.data)
        }
      }

    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Categorize papers by status
  const pendingPapers = papers.filter(paper =>
    paper.status === 'submitted' ||
    paper.status === 'recommended_for_publication' ||
    (paper.status === 'under_review' && paper.reviews.length > 0)
  )
  const approvedPapers = papers.filter(paper => paper.status === 'approved')
  const rejectedPapers = papers.filter(paper => paper.status === 'rejected')

  const handlePublicationDecision = async (paperId: string, status: 'approved' | 'rejected' | 'published') => {
    const paper = papers.find(p => p.id === paperId)
    if (!paper) return

    try {
      const result = await updatePaper(paperId, {
        ...paper,
        status: status
      })

      if (result.success) {
        // Refresh the papers list to show updated status
        fetchData()
        showStatus(`Paper ${status} successfully!`)
      } else {
        showStatus(`Failed to ${status} paper: ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Failed to update paper status:', error)
      showStatus(`Failed to ${status} paper`, 'error')
    }
  }

  const getAverageScore = (reviews: Review[]) => {
    if (reviews.length === 0) return 0
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0)
    return (sum / reviews.length).toFixed(1)
  }

  const getRecommendationSummary = (reviews: Review[]) => {
    const counts = reviews.reduce((acc, review) => {
      acc[review.recommendation] = (acc[review.recommendation] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts)
      .map(([rec, count]) => `${count} ${rec.replace(/_/g, ' ')}`)
      .join(', ')
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (newStaffForm.role !== 'editor' && newStaffForm.role !== 'coordinator') {
        showStatus('Invalid role selected', 'error')
        return
      }

      const result = await createAdminUser({
        name: newStaffForm.name,
        email: newStaffForm.email,
        password: newStaffForm.password,
        role: newStaffForm.role as 'editor' | 'coordinator'
      })

      if (result.success) {
        showStatus(`${newStaffForm.role} created successfully!`)
        setShowAddStaffModal(false)
        setNewStaffForm({ name: '', email: '', password: '', role: 'editor' })
        // Refresh staff list
        const staffResult = await getAdminStaff()
        if (staffResult.success && staffResult.data) {
          setStaff(staffResult.data)
        }
      } else {
        showStatus(result.error || 'Failed to create staff', 'error')
      }
    } catch (error) {
      console.error('Failed to create staff:', error)
      showStatus('Failed to create staff', 'error')
    }
  }

  const contactEditor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editorContactForm.message) return

    try {
      let messageContent = `Admin Message: ${editorContactForm.message}`

      // If a paper is selected, include paper info and send to the editor who reviewed it
      if (editorContactForm.paperId) {
        const paper = papers.find(p => p.id === editorContactForm.paperId)
        if (paper && paper.reviews.length > 0) {
          const editorId = paper.reviews[0].reviewer_id
          messageContent = `Admin Message regarding "${paper.title}": ${editorContactForm.message}`

          const result = await sendMessage(editorId, messageContent)

          if (result.success) {
            setEditorContactForm({ paperId: '', message: '' })
            showStatus('Message sent to editor successfully!')
            return
          }
        }
      }

      showStatus('Please select a paper to contact its editor', 'error')
    } catch (error) {
      console.error('Failed to contact editor:', error)
      showStatus('Failed to send message to editor', 'error')
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (notification.paper_id) {
      const paper = papers.find(p => p.id === notification.paper_id)
      if (paper) {
        setSelectedPaper(paper)
      }
    }

    if (!notification.is_read) {
      try {
        const result = await markNotificationRead(notification.id)
        if (result.success) {
          setNotifications(notifications.map(n =>
            n.id === notification.id ? { ...n, is_read: true } : n
          ))
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error)
      }
    }
  }

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.is_read)
      await Promise.all(unread.map(n => markNotificationRead(n.id)))
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={user} title="Admin Dashboard" onLogout={onLogout} />

      {/* Status Messages */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 mt-4">
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 sm:py-3 rounded relative animate-in fade-in duration-300 text-sm" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded relative animate-in fade-in duration-300 text-sm" role="alert">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-3 sm:p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wider">System Overview</h2>
                <span className="text-[10px] text-gray-500 font-medium uppercase">Live Stats</span>
              </div>
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <p className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Papers</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">{papers.length}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-2 sm:p-3 rounded-lg border border-green-100 dark:border-green-900/30">
                    <p className="text-[10px] sm:text-xs font-semibold text-green-600 dark:text-green-400 uppercase">Avg Score</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {papers.length > 0 ? getAverageScore(papers.flatMap(p => p.reviews)) : '0'}
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-2 sm:p-3 rounded-lg border border-purple-100 dark:border-purple-900/30">
                    <p className="text-[10px] sm:text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Reviews</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {papers.reduce((acc, paper) => acc + paper.reviews.length, 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 sm:space-x-4 mb-4 sm:mb-6 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveTab('reviewed')}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${activeTab === 'reviewed'
                  ? 'bg-red-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                Reviewed Papers
              </button>
              <button
                onClick={() => setActiveTab('validated')}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${activeTab === 'validated'
                  ? 'bg-red-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                Validated Papers
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-3 sm:px-4 py-2 rounded-md text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${activeTab === 'staff'
                  ? 'bg-red-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                Manage Staff
              </button>
            </div>

            {/* Content Area */}
            {activeTab === 'staff' ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">Staff Management</h2>
                  <button
                    onClick={() => setShowAddStaffModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span className="text-sm sm:text-base">Add Staff</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold text-xs sm:text-sm">
                      <tr>
                        <th className="p-2 sm:p-4 whitespace-nowrap">Name</th>
                        <th className="p-2 sm:p-4 whitespace-nowrap">Username (Email)</th>
                        <th className="p-2 sm:p-4 whitespace-nowrap">Role</th>
                        <th className="p-2 sm:p-4 whitespace-nowrap">Joined</th>
                        <th className="p-2 sm:p-4 whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {staff.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-500">No staff members found.</td>
                        </tr>
                      ) : (
                        staff.map(member => (
                          <tr
                            key={member.id}
                            onClick={() => {
                              setSelectedStaff(member)
                              setShowStaffModal(true)
                            }}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                          >
                            <td className="p-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              {member.name}
                            </td>
                            <td className="p-4">{member.email}</td>
                            <td className="p-4 text-xs font-bold uppercase tracking-wider">
                              <span className={`px-2 py-1 rounded-full ${member.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                member.role === 'editor' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                {member.role}
                              </span>
                            </td>
                            <td className="p-4">{new Date(member.created_at).toLocaleDateString()}</td>
                            <td className="p-4">
                              {member.is_verified ? (
                                <span className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded w-fit">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </span>
                              ) : (
                                <span className="text-yellow-600 text-xs">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'reviewed' ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 sm:p-6 border-b dark:border-gray-700">
                  <h2 className="text-lg sm:text-xl font-semibold text-yellow-600">Reviewed Papers ({pendingPapers.length})</h2>
                </div>
                <div className="p-4 sm:p-6">
                  {pendingPapers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No papers pending approval</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingPapers.map(paper => (
                        <div
                          key={paper.id}
                          id={`paper-${paper.id}`}
                          onClick={() => setSelectedPaper(paper)}
                          className="border dark:border-gray-700 rounded-lg p-4 transition-all duration-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold dark:text-white group-hover:text-red-600 transition-colors">{paper.title}</h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedAuthor(paper)
                                  setShowAuthorModal(true)
                                }}
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 hover:underline transition-colors text-left"
                              >
                                Author: {paper.author_name || 'Unknown'}
                              </button>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Submitted: {new Date(paper.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {paper.reviews.length} Review{paper.reviews.length !== 1 ? 's' : ''}
                              </span>
                              <p className="text-lg font-bold text-blue-600">
                                {paper.reviews.length > 0 ? `${getAverageScore(paper.reviews)}/5` : 'No Rating'}
                              </p>
                            </div>
                          </div>

                          {paper.abstract && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-2">{paper.abstract}</p>
                          )}

                          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <p className="text-sm font-medium mb-2 dark:text-white">Review Summary:</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {paper.reviews.length > 0 ? getRecommendationSummary(paper.reviews) : 'No reviews submitted yet.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-blue-600">Validated Papers</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold">
                      <tr>
                        <th className="p-4">Title</th>
                        <th className="p-4">PI Name</th>
                        <th className="p-4">Institution</th>
                        <th className="p-4">Fiscal Year</th>
                        <th className="p-4">Budget</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {papers.filter(p => p.pi_name || p.institution_code).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500">No validated papers found.</td>
                        </tr>
                      ) : (
                        papers.filter(p => p.pi_name || p.institution_code).map(paper => (
                          <tr key={paper.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="p-4 font-medium text-gray-900 dark:text-white">{paper.title}</td>
                            <td className="p-4">{paper.pi_name || '-'}</td>
                            <td className="p-4">{paper.institution_code || '-'}</td>
                            <td className="p-4">{paper.fiscal_year || '-'}</td>
                            <td className="p-4">{paper.allocated_budget ? paper.allocated_budget.toLocaleString() : '-'}</td>
                            <td className="p-4 capitalize">{paper.status.replace(/_/g, ' ')}</td>
                            <td className="p-4">
                              <button
                                onClick={() => setSelectedPaper(paper)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-6 sticky top-[5.5rem]">
            {/* Contact Editor Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                  <MessageSquare className="w-6 h-6 mr-2 text-red-600" />
                  Contact Editor
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Send instructions or feedback to reviewers</p>
              </div>
              <div className="p-6">
                <form onSubmit={contactEditor} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-red-500" />
                      Select Paper (Required)
                    </label>
                    <select
                      value={editorContactForm.paperId}
                      onChange={(e) => setEditorContactForm({ ...editorContactForm, paperId: e.target.value })}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                      required
                    >
                      <option value="">Choose a paper...</option>
                      {papers.map(paper => (
                        <option key={paper.id} value={paper.id}>
                          {paper.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                      Message will be sent to the editor who reviewed this paper
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2 text-red-500" />
                      Message to Editor
                    </label>
                    <textarea
                      value={editorContactForm.message}
                      onChange={(e) => setEditorContactForm({ ...editorContactForm, message: e.target.value })}
                      rows={4}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                      placeholder="Enter your message to the editor..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gray-800 dark:bg-gray-700 text-white px-6 py-3 rounded-xl hover:bg-gray-900 dark:hover:bg-gray-600 transition-all flex items-center justify-center font-bold shadow-md hover:shadow-lg active:scale-[0.98]"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Send to Editor
                  </button>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Approved Papers Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6 border-b dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-green-600">Approved Papers ({approvedPapers.length})</h2>
                </div>
                <div className="p-6">
                  {approvedPapers.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No approved papers</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {approvedPapers.map(paper => (
                        <div
                          key={paper.id}
                          id={`paper-${paper.id}`}
                          onClick={() => setSelectedPaper(paper)}
                          className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer"
                        >
                          <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{paper.title}</h3>
                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                              <span>{paper.author_name || 'Unknown'}</span>
                              <span>{new Date(paper.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Rejected Papers Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6 border-b dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-red-600">Rejected Papers ({rejectedPapers.length})</h2>
                </div>
                <div className="p-6">
                  {rejectedPapers.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No rejected papers</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rejectedPapers.map(paper => (
                        <div
                          key={paper.id}
                          id={`paper-${paper.id}`}
                          onClick={() => setSelectedPaper(paper)}
                          className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-lg p-4 transition-all duration-300 hover:shadow-md cursor-pointer"
                        >
                          <div className="flex flex-col gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{paper.title}</h3>
                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                              <span>{paper.author_name || 'Unknown'}</span>
                              <span>{new Date(paper.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paper Details Modal */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-semibold text-red-600">Paper Details</h2>
              <button onClick={() => setSelectedPaper(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              <div>
                <h3 className="text-2xl font-bold dark:text-white mb-2">{selectedPaper.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <button
                    onClick={() => {
                      setSelectedAuthor(selectedPaper)
                      setShowAuthorModal(true)
                    }}
                    className="hover:text-red-600 hover:underline transition-colors"
                  >
                    <span className="font-medium">Author:</span> {selectedPaper.author_name}
                  </button>
                  <p><span className="font-medium">Email:</span> {selectedPaper.author_email}</p>
                  <p><span className="font-medium">Submitted:</span> {new Date(selectedPaper.created_at).toLocaleDateString()}</p>
                  <p><span className="font-medium">Status:</span> <span className="capitalize">{selectedPaper.status.replace(/_/g, ' ')}</span></p>
                </div>
              </div>

              {selectedPaper.abstract && (
                <div>
                  <h4 className="font-semibold dark:text-white mb-2">Abstract</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg leading-relaxed">
                    {selectedPaper.abstract}
                  </p>
                </div>
              )}

              {selectedPaper.file_url && (
                <div>
                  <h4 className="font-semibold dark:text-white mb-2">Manuscript</h4>
                  <a
                    href={selectedPaper.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Paper
                  </a>
                </div>
              )}

              {/* Research Details Section */}
              {(selectedPaper.pi_name || selectedPaper.institution_code) && (
                <div className="border-t dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold dark:text-white mb-4">Research Project Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2 border-b dark:border-gray-600 pb-1">Project Identification</h5>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500 dark:text-gray-400">Institution Code:</span> <span className="dark:text-gray-200">{selectedPaper.institution_code || '-'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">Fiscal Year:</span> <span className="dark:text-gray-200">{selectedPaper.fiscal_year || '-'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">Research Type:</span> <span className="dark:text-gray-200">{selectedPaper.research_type || '-'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">Completion Status:</span> <span className="dark:text-gray-200">{selectedPaper.completion_status || '-'}</span></p>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2 border-b dark:border-gray-600 pb-1">Principal Investigator</h5>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500 dark:text-gray-400">Name:</span> <span className="dark:text-gray-200">{selectedPaper.pi_name || '-'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">Gender:</span> <span className="dark:text-gray-200">{selectedPaper.pi_gender || '-'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">Co-Investigators:</span> <span className="dark:text-gray-200">{selectedPaper.co_investigators || '-'}</span></p>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2 border-b dark:border-gray-600 pb-1">Budget & Funding</h5>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500 dark:text-gray-400">Allocated Budget:</span> <span className="dark:text-gray-200">{selectedPaper.allocated_budget?.toLocaleString() || '0'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">External Budget:</span> <span className="dark:text-gray-200">{selectedPaper.external_budget?.toLocaleString() || '0'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">NRF Fund:</span> <span className="dark:text-gray-200">{selectedPaper.nrf_fund?.toLocaleString() || '0'}</span></p>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2 border-b dark:border-gray-600 pb-1">Outcomes</h5>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500 dark:text-gray-400">Benefited Industry:</span> <span className="dark:text-gray-200">{selectedPaper.benefited_industry || '-'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">Produced Prototype:</span> <span className="dark:text-gray-200">{selectedPaper.produced_prototype || '-'}</span></p>
                        <p><span className="text-gray-500 dark:text-gray-400">Submitted to Incubator:</span> <span className="dark:text-gray-200">{selectedPaper.submitted_to_incubator || '-'}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t dark:border-gray-700 pt-6">
                <h4 className="text-lg font-semibold dark:text-white mb-4">Reviews & Ratings</h4>
                {selectedPaper.reviews.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 italic">No reviews submitted yet.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedPaper.reviews.map((review, index) => (
                      <div key={review.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-red-600">Reviewer {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium dark:text-white">Rating: {review.rating}/5</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${review.recommendation === 'accept' ? 'bg-green-100 text-green-800' :
                              review.recommendation === 'reject' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                              {review.recommendation.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{review.comments}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t dark:border-gray-700 pt-6 flex flex-col sm:flex-row justify-end gap-2 sm:space-x-3">
                <button
                  onClick={() => {
                    handlePublicationDecision(selectedPaper.id, 'rejected')
                    setSelectedPaper(null)
                  }}
                  className="order-3 sm:order-1 px-6 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-sm sm:text-base"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    handlePublicationDecision(selectedPaper.id, 'approved')
                    setSelectedPaper(null)
                  }}
                  className="order-2 sm:order-1 px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium text-sm sm:text-base"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    handlePublicationDecision(selectedPaper.id, 'published')
                    setSelectedPaper(null)
                  }}
                  className="order-1 sm:order-1 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
                >
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Author Detail Modal */}
      {showAuthorModal && selectedAuthor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3 sm:gap-4 truncate mr-2">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-lg sm:text-xl">
                  {selectedAuthor.author_name?.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{selectedAuthor.author_name}</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{selectedAuthor.author_email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthorModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Author Type</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedAuthor.author_author_type || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedAuthor.author_author_category || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Rank</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedAuthor.author_academic_rank || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Qualification</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedAuthor.author_qualification || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employment Type</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedAuthor.author_employment_type || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Year</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedAuthor.author_academic_year || 'N/A'}</p>
                </div>
              </div>

              {selectedAuthor.author_bio && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bio</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedAuthor.author_bio}</p>
                </div>
              )}

              <div className="pt-6 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setShowAuthorModal(false)}
                  className="order-2 sm:order-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const message = encodeURIComponent(`Hello ${selectedAuthor.author_name}, I am contacting you regarding your paper "${selectedAuthor.title}".`)
                    window.location.href = `/chat?userId=${selectedAuthor.author_id}&message=${message}`
                  }}
                  className="order-1 sm:order-2 px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact Author
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-red-600" />
                Add New Staff
              </h2>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300 mb-4">
                Creating a staff account will generate a confirmed user. Please share the credentials with the staff member securely.
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newStaffForm.name}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                  className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Username (Email)</label>
                <input
                  type="email"
                  required
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white"
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                    className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white"
                  >
                    <option value="editor">Editor</option>
                    <option value="coordinator">Coordinator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={newStaffForm.password}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                    className="w-full p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all dark:text-white"
                    placeholder="Generates if empty..." // In current logic we require it, let's make it input
                  />
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="order-2 sm:order-1 flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-white dark:bg-gray-800 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="order-1 sm:order-2 flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-600/20 text-sm sm:text-base"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-lg">
                  {selectedStaff.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">Staff Profile</h2>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
              <div className="text-center mb-6">
                <div className="h-24 w-24 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto flex items-center justify-center text-4xl font-bold text-gray-500 dark:text-gray-400 mb-3">
                  {selectedStaff.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedStaff.name}</h3>
                <p className="text-gray-500 dark:text-gray-400">{selectedStaff.email}</p>
                <div className="mt-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider ${selectedStaff.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    selectedStaff.role === 'editor' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                    {selectedStaff.role}
                  </span>
                </div>
              </div>

              <div className="space-y-4 border-t dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700/50">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Joined Date</span>
                  <span className="text-gray-900 dark:text-white">{new Date(selectedStaff.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b dark:border-gray-700/50">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Account Status</span>
                  {selectedStaff.is_verified ? (
                    <span className="flex items-center text-green-600 font-medium bg-green-50 px-2 py-1 rounded">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-yellow-600 font-medium flex items-center bg-yellow-50 px-2 py-1 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">User ID</span>
                  <span className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 p-1 rounded">{selectedStaff.id.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
