'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Download, Upload, Edit, Clock, X, MessageSquare, Send, CheckCircle, AlertCircle, ChevronRight, User as UserIcon } from 'lucide-react'
import { User, Paper, Review, getPapers, getReviews, createReview, updatePaper, updatePaperDetails, uploadFile, recommendPaper, sendMessage, getAdminUser, createNotification } from '@/lib/api'
import Header from './Header'

interface EditorPanelProps {
  user: User
  onLogout: () => void
}

export default function EditorPanel({ user, onLogout }: EditorPanelProps) {
  const router = useRouter()
  const [papers, setPapers] = useState<Paper[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null)
  const [editForm, setEditForm] = useState({ title: '', abstract: '', file: null as File | null })
  const [reviewData, setReviewData] = useState({
    rating: 100,
    problem_statement: 100,
    literature_review: 100,
    methodology: 100,
    results: 100,
    conclusion: 100,
    originality: 100,
    clarity_organization: 100,
    contribution_knowledge: 100,
    technical_quality: 100,
    comments: '',
    recommendation: 'accept' as const
  })
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({ paperId: '', message: '' })
  const [adminContactForm, setAdminContactForm] = useState({ paperId: '', message: '' })
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedAuthor, setSelectedAuthor] = useState<Paper | null>(null)
  const [showAuthorModal, setShowAuthorModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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

  // Paper Details Submission State
  const [detailsPaper, setDetailsPaper] = useState<Paper | null>(null)
  const [detailsForm, setDetailsForm] = useState({
    institution_code: '',
    publication_isced_band: '',
    publication_title_amharic: '',
    title: '',
    publication_date: '',
    publication_type: '',
    journal_type: '',
    journal_name: '',
    indigenous_knowledge: false,
    fiscal_year: '',
    allocated_budget: 0,
    external_budget: 0,
    nrf_fund: 0,
    research_type: '',
    completion_status: '',
    female_researchers: 0,
    male_researchers: 0,
    benefited_industry: '',
    ethical_clearance: '',
    pi_name: '',
    pi_gender: '',
    co_investigators: '',
    produced_prototype: '',
    hetril_collaboration: '',
    submitted_to_incubator: ''
  })



  useEffect(() => {
    fetchData()
    fetchAdminUser()
  }, [])

  // Handle hash navigation for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash && hash.startsWith('#paper-')) {
        const paperId = hash.replace('#paper-', '')

        // Find the paper
        const paper = papers.find(p => p.id === paperId)
        if (paper) {
          // If it's a pending paper, open the review modal
          if (getPaperStatus(paper) === 'pending') {
            setSelectedPaper(paper)
            setShowReviewModal(true)
          }

          // Clear hash so it doesn't re-trigger
          window.history.replaceState(null, '', window.location.pathname + window.location.search)

          // Scroll to it - ensure it's rendered first
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
      const [papersResult, reviewsResult] = await Promise.all([
        getPapers(),
        getReviews()
      ])

      if (reviewsResult.success && reviewsResult.data) {
        setReviews(reviewsResult.data)
      }

      if (papersResult.success && papersResult.data) {
        console.log('[EditorPanel] All papers from API:', papersResult.data)

        const allReviews = reviewsResult.success && reviewsResult.data ? reviewsResult.data : []

        // Filter papers:
        // 1. Papers that need review (submitted, under_review)
        // 2. Papers already reviewed by this user (regardless of status)
        // 3. Papers recommended for publication (waiting for admin)
        const relevantPapers = papersResult.data.filter((paper: Paper) => {
          const isActive = paper.status === 'submitted' ||
            paper.status === 'under_review' ||
            paper.status === 'recommended_for_publication'

          const hasReviewed = allReviews.some(r => r.paper_id === paper.id && r.reviewer_id === user.id)

          return isActive || hasReviewed
        })

        console.log('[EditorPanel] Filtered relevant papers:', relevantPapers)
        setPapers(relevantPapers)
      }

    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }
  const fetchAdminUser = async () => {
    try {
      const result = await getAdminUser()
      if (result.success && result.data) {
        setAdminUserId(result.data.id)
      }
    } catch (error) {
      console.error('Failed to fetch admin user:', error)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPaper && reviewData.rating && reviewData.comments) {
      try {
        const reviewDataSubmit = {
          paper_id: selectedPaper.id,
          reviewer_id: user.id,
          rating: reviewData.rating,
          problem_statement: reviewData.problem_statement,
          literature_review: reviewData.literature_review,
          methodology: reviewData.methodology,
          results: reviewData.results,
          conclusion: reviewData.conclusion,
          originality: reviewData.originality,
          clarity_organization: reviewData.clarity_organization,
          contribution_knowledge: reviewData.contribution_knowledge,
          technical_quality: reviewData.technical_quality,
          comments: reviewData.comments,
          recommendation: reviewData.recommendation
        }

        const result = await createReview(reviewDataSubmit)
        if (result.success) {
          // Refresh data to move paper to reviewed list
          await fetchData()
          setSelectedPaper(null)
          setShowReviewModal(false)
          setReviewData({
            rating: 100,
            problem_statement: 100,
            literature_review: 100,
            methodology: 100,
            results: 100,
            conclusion: 100,
            originality: 100,
            clarity_organization: 100,
            contribution_knowledge: 100,
            technical_quality: 100,
            comments: '',
            recommendation: 'accept'
          })
          showStatus('Review submitted successfully!')
        }
      } catch (error) {
        console.error('Failed to submit review:', error)
        showStatus('Failed to submit review', 'error')
      }
    }
  }

  const handleEditClick = (paper: Paper) => {
    setEditingPaper(paper)
    setEditForm({ title: paper.title, abstract: paper.abstract || '', file: null })
  }

  const handleDetailsClick = (paper: Paper) => {
    setDetailsPaper(paper)
    setDetailsForm({
      institution_code: paper.institution_code || '',
      publication_isced_band: paper.publication_isced_band || '',
      publication_title_amharic: paper.publication_title_amharic || '',
      title: paper.title || '',
      publication_date: paper.publication_date ? new Date(paper.publication_date).toISOString().split('T')[0] : '',
      publication_type: paper.publication_type || '',
      journal_type: paper.journal_type || '',
      journal_name: paper.journal_name || '',
      indigenous_knowledge: paper.indigenous_knowledge || false,
      fiscal_year: paper.fiscal_year || '',
      allocated_budget: paper.allocated_budget || 0,
      external_budget: paper.external_budget || 0,
      nrf_fund: paper.nrf_fund || 0,
      research_type: paper.research_type || '',
      completion_status: paper.completion_status || '',
      female_researchers: paper.female_researchers || 0,
      male_researchers: paper.male_researchers || 0,
      benefited_industry: paper.benefited_industry || '',
      ethical_clearance: paper.ethical_clearance || '',
      pi_name: paper.pi_name || '',
      pi_gender: paper.pi_gender || '',
      co_investigators: paper.co_investigators || '',
      produced_prototype: paper.produced_prototype || '',
      hetril_collaboration: paper.hetril_collaboration || '',
      submitted_to_incubator: paper.submitted_to_incubator || ''
    })
  }

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailsPaper) return

    try {
      const updates = {
        ...detailsForm,
        title: detailsForm.title,
        status: detailsPaper.status,
        publication_date: detailsForm.publication_date ? new Date(detailsForm.publication_date).toISOString() : undefined
      }

      const result = await updatePaperDetails(detailsPaper.id, updates)
      if (result.success && result.data) {
        setPapers(papers.map(p => p.id === detailsPaper.id ? result.data! : p))
        setDetailsPaper(null)
        showStatus('Paper details updated successfully!')
      } else {
        showStatus('Failed to update paper details: ' + (result.error || 'Unknown error'), 'error')
      }
    } catch (error) {
      console.error('Failed to update paper details:', error)
      showStatus('Failed to update paper details', 'error')
    }
  }

  const handleUpdatePaper = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPaper) return

    try {
      let fileUrl = editingPaper.file_url
      if (editForm.file) {
        const uploadResult = await uploadFile(editForm.file)
        if (uploadResult.success && uploadResult.data) {
          fileUrl = uploadResult.data.url
        }
      }

      const updates = {
        title: editForm.title,
        abstract: editForm.abstract,
        file_url: fileUrl,
        status: editingPaper.status
      }

      const result = await updatePaper(editingPaper.id, updates)
      if (result.success && result.data) {
        setPapers(papers.map(p => p.id === editingPaper.id ? result.data! : p))
        setEditingPaper(null)
      }
    } catch (error) {
      console.error('Failed to update paper:', error)
    }
  }



  const sendFeedbackToAuthor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackForm.paperId || !feedbackForm.message) return

    try {
      const paper = papers.find(p => p.id === feedbackForm.paperId)
      if (!paper) return

      await sendMessage(
        paper.author_id,
        `Feedback on "${paper.title}": ${feedbackForm.message}`
      )

      setFeedbackForm({ paperId: '', message: '' })
      showStatus('Feedback sent to author successfully!')
    } catch (error) {
      console.error('Failed to send feedback:', error)
      showStatus('Failed to send feedback', 'error')
    }
  }

  const contactAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminContactForm.message) return

    try {
      let targetAdminId = adminUserId

      // If admin ID is missing, try to fetch it again
      if (!targetAdminId) {
        const adminResult = await getAdminUser()
        if (adminResult.success && adminResult.data) {
          targetAdminId = adminResult.data.id
          setAdminUserId(targetAdminId)
        } else {
          alert('Admin user not available. Please try again later.')
          return
        }
      }

      let messageContent = `Editor Message: ${adminContactForm.message}`
      let paperId: string | undefined = undefined

      // If a paper is selected, include paper info
      if (adminContactForm.paperId) {
        const paper = papers.find(p => p.id === adminContactForm.paperId)
        if (paper) {
          messageContent = `Editor Message regarding "${paper.title}": ${adminContactForm.message}`
          paperId = paper.id
        }
      }

      // Create notification for admin
      const result = await createNotification(
        targetAdminId,
        messageContent,
        paperId
      )

      if (result.success) {
        setAdminContactForm({ paperId: '', message: '' })
        showStatus('Notification sent to admin successfully!')
      } else {
        showStatus('Failed to send notification: ' + (result.error || 'Unknown error'), 'error')
      }
    } catch (error) {
      console.error('Failed to contact admin:', error)
      showStatus('Failed to send notification to admin', 'error')
    }
  }
  const getPaperStatus = (paper: Paper) => {
    const existingReview = reviews.find(r => r.paper_id === paper.id && r.reviewer_id === user.id)
    return existingReview ? 'reviewed' : 'pending'
  }

  const sendToAdmin = async (paper: Paper) => {
    if (!adminUserId) {
      alert('Admin user not found')
      return
    }

    try {
      console.log('[EditorPanel] Sending paper to admin:', paper.id)
      // Use the dedicated recommend endpoint which is allowed for editors
      const result = await recommendPaper(paper.id)

      if (!result.success) {
        console.error('[EditorPanel] Failed to recommend paper:', result.error)
        showStatus('Failed to send paper to admin: ' + result.error, 'error')
        return
      }

      console.log('[EditorPanel] Paper status updated, sending notification...')
      // Send notification to admin
      const notifResult = await createNotification(
        adminUserId,
        `Paper "${paper.title}" has been reviewed by ${user.name} and is ready for your review.`,
        paper.id
      )

      if (!notifResult.success) {
        console.warn('[EditorPanel] Failed to send notification to admin:', notifResult.error)
      }

      // Refresh the papers list - the UI will update based on the new status
      await fetchData()
    } catch (error) {
      console.error('Failed to send paper to admin:', error)
      showStatus('Failed to send paper to admin', 'error')
    }
  }

  // Categorize papers
  const papersForReview = papers.filter(paper => getPaperStatus(paper) === 'pending')
  const papersReviewed = papers.filter(paper => getPaperStatus(paper) === 'reviewed')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading editor panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={user} title="Editor Panel" onLogout={onLogout} />

      {/* Status Messages */}
      <div className="max-w-7xl mx-auto px-6 mt-4">
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative animate-in fade-in duration-300" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative animate-in fade-in duration-300" role="alert">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Papers for Review Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 sm:p-6 border-b dark:border-gray-700">
                <h2 className="text-lg sm:text-xl font-semibold text-red-600">Papers for Review ({papersForReview.length})</h2>
              </div>
              <div className="p-4 sm:p-6">
                {papersForReview.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No papers pending review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {papersForReview.map((paper) => (
                      <div key={paper.id} id={`paper-${paper.id}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 transition-all hover:shadow-md border border-gray-200 dark:border-gray-600 overflow-hidden">
                        <div className="flex flex-col space-y-4">
                          <div className="w-full">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending Review
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {new Date(paper.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">{paper.title}</h3>
                              <button
                                onClick={() => {
                                  setSelectedAuthor(paper)
                                  setShowAuthorModal(true)
                                }}
                                className="text-sm text-gray-600 dark:text-gray-300 mb-2 hover:text-red-600 hover:underline transition-colors text-left"
                              >
                                Author: {paper.author_name}
                              </button>
                              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{paper.abstract}</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-2 pt-4 border-t dark:border-gray-600">
                              {paper.file_url && (
                                <button
                                  onClick={() => window.open(paper.file_url, '_blank')}
                                  className="w-full sm:w-auto flex items-center justify-center text-xs text-blue-600 hover:text-blue-700 font-medium px-4 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30"
                                >
                                  <Download className="w-3.5 h-3.5 mr-2" />
                                  Download PDF
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedPaper(paper)
                                  setShowReviewModal(true)
                                }}
                                className="w-full sm:w-auto justify-center bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm font-semibold shadow-sm"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Start Review
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="space-y-6 sticky top-24">
            {/* Papers Reviewed Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 sm:p-6 border-b dark:border-gray-700">
                <h2 className="text-lg sm:text-xl font-semibold text-green-600">Papers Reviewed ({papersReviewed.length})</h2>
              </div>
              <div className="p-4 sm:p-6">
                {papersReviewed.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No reviewed papers yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {papersReviewed.map((paper) => (
                      <div key={paper.id} className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 transition-all hover:shadow-md border border-green-200 dark:border-green-800">
                        <div className="flex flex-col gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{paper.title}</h3>
                          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>{paper.author_name}</span>
                            <span>{new Date(paper.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <button
                              onClick={() => {
                                setSelectedPaper(paper)
                                setShowReviewModal(true)
                              }}
                              className="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                            >
                              Edit Review
                            </button>
                            <button
                              onClick={() => handleDetailsClick(paper)}
                              className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 border border-yellow-200"
                            >
                              Validate Details
                            </button>
                            {paper.file_url && (
                              <button
                                onClick={() => window.open(paper.file_url, '_blank')}
                                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 border border-blue-200 flex items-center"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download PDF
                              </button>
                            )}
                            {paper.status === 'recommended_for_publication' ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200 flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Sent to Admin
                              </span>
                            ) : (
                              <button
                                onClick={() => sendToAdmin(paper)}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                              >
                                Send to Admin
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Feedback for Author Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-blue-100 dark:border-blue-900/30 overflow-hidden">
              <div className="p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30">
                <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400 flex items-center">
                  <MessageSquare className="w-6 h-6 mr-2" />
                  Send Feedback to Author
                </h2>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">Direct communication with the principal investigator</p>
              </div>
              <div className="p-4 sm:p-6">
                <form onSubmit={sendFeedbackToAuthor} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-blue-500" />
                      Select Paper
                    </label>
                    <select
                      value={feedbackForm.paperId}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, paperId: e.target.value })}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    >
                      <option value="">Choose a paper...</option>
                      {papers.map(paper => (
                        <option key={paper.id} value={paper.id}>
                          {paper.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                      Feedback Message
                    </label>
                    <textarea
                      value={feedbackForm.message}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                      rows={4}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                      placeholder="Enter your detailed feedback for the author..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center font-bold shadow-md hover:shadow-lg active:scale-[0.98]"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Send Feedback
                  </button>
                </form>
              </div>
            </div>

            {/* Contact Admin Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                  <MessageSquare className="w-6 h-6 mr-2 text-red-600" />
                  Contact Admin
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Escalate issues or ask for clarification</p>
              </div>
              <div className="p-4 sm:p-6">
                <form onSubmit={contactAdmin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-red-500" />
                      Select Paper (Optional)
                    </label>
                    <select
                      value={adminContactForm.paperId}
                      onChange={(e) => setAdminContactForm({ ...adminContactForm, paperId: e.target.value })}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                    >
                      <option value="">General message (no specific paper)</option>
                      {papers.map(paper => (
                        <option key={paper.id} value={paper.id}>
                          {paper.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2 text-red-500" />
                      Message to Admin
                    </label>
                    <textarea
                      value={adminContactForm.message}
                      onChange={(e) => setAdminContactForm({ ...adminContactForm, message: e.target.value })}
                      rows={4}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                      placeholder="Enter your message to the admin..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gray-800 dark:bg-gray-700 text-white px-6 py-3 rounded-xl hover:bg-gray-900 dark:hover:bg-gray-600 transition-all flex items-center justify-center font-bold shadow-md hover:shadow-lg active:scale-[0.98]"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Send to Admin
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {
        editingPaper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                <h2 className="text-lg sm:text-xl font-semibold text-red-600">Edit Paper</h2>
                <button onClick={() => setEditingPaper(null)} className="text-gray-500 hover:text-gray-700 p-1">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto">
                <form onSubmit={handleUpdatePaper} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Abstract</label>
                    <textarea
                      value={editForm.abstract}
                      onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
                      rows={6}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Revised Version</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setEditForm({ ...editForm, file })
                        }
                      }}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
                    <button type="button" onClick={() => setEditingPaper(null)} className="order-2 sm:order-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 text-sm sm:text-base">Cancel</button>
                    <button type="submit" className="order-1 sm:order-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm sm:text-base">Update Paper</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {
        detailsPaper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                <h2 className="text-base sm:text-xl font-semibold text-red-600 truncate mr-4">Validate Details: {detailsPaper.title}</h2>
                <button onClick={() => setDetailsPaper(null)} className="text-gray-500 hover:text-gray-700 p-1">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto">
                <form onSubmit={handleUpdateDetails} className="space-y-8">
                  {/* Section 1: Project Identification */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-red-600" />
                      Project Identification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Institution Code</label>
                        <select
                          value={detailsForm.institution_code}
                          onChange={(e) => setDetailsForm({ ...detailsForm, institution_code: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="">Select Institution</option>
                          <option value="SMU">St. Mary's University (SMU)</option>
                          <option value="SMU_Green">SMU_Green</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fiscal Year</label>
                        <select
                          value={detailsForm.fiscal_year}
                          onChange={(e) => setDetailsForm({ ...detailsForm, fiscal_year: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="">Select Fiscal Year</option>
                          <option value="2019/20">2019/20</option>
                          <option value="2020/21">2020/21</option>
                          <option value="2021/22">2021/22</option>
                          <option value="2022/23">2022/23</option>
                          <option value="2023/24">2023/24</option>
                          <option value="2024/25">2024/25</option>
                          <option value="2025/26">2025/26</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ISCED Band</label>
                        <select
                          value={detailsForm.publication_isced_band}
                          onChange={(e) => setDetailsForm({ ...detailsForm, publication_isced_band: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="">Select Band</option>
                          <option value="01">01 - Education</option>
                          <option value="02">02 - Arts and humanities</option>
                          <option value="03">03 - Social sciences, journalism and information</option>
                          <option value="04">04 - Business, administration and law</option>
                          <option value="05">05 - Natural sciences, mathematics and statistics</option>
                          <option value="06">06 - Information and Communication Technologies</option>
                          <option value="07">07 - Engineering, manufacturing and construction</option>
                          <option value="08">08 - Agriculture, forestry, fisheries and veterinary</option>
                          <option value="09">09 - Health and welfare</option>
                          <option value="10">10 - Services</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Research ID</label>
                        <input
                          type="text"
                          value={detailsPaper.publication_id || 'Auto-generated'}
                          disabled
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-100 dark:text-gray-500 rounded-md"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Research Name (English)</label>
                        <input
                          type="text"
                          value={detailsForm.title}
                          onChange={(e) => setDetailsForm({ ...detailsForm, title: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Research Name (Amharic)</label>
                        <input
                          type="text"
                          value={detailsForm.publication_title_amharic}
                          onChange={(e) => setDetailsForm({ ...detailsForm, publication_title_amharic: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: PI Details */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                      Principal Investigator (PI) Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PI Name</label>
                        <input
                          type="text"
                          value={detailsForm.pi_name}
                          onChange={(e) => setDetailsForm({ ...detailsForm, pi_name: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PI Gender</label>
                        <select
                          value={detailsForm.pi_gender}
                          onChange={(e) => setDetailsForm({ ...detailsForm, pi_gender: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Budget & Funding */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2 text-green-600" />
                      Budget & Funding
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allocated Budget</label>
                        <input
                          type="number"
                          min="0"
                          value={detailsForm.allocated_budget}
                          onChange={(e) => setDetailsForm({ ...detailsForm, allocated_budget: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">External Budget</label>
                        <input
                          type="number"
                          min="0"
                          value={detailsForm.external_budget}
                          onChange={(e) => setDetailsForm({ ...detailsForm, external_budget: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">NRF Fund</label>
                        <input
                          type="number"
                          min="0"
                          value={detailsForm.nrf_fund}
                          onChange={(e) => setDetailsForm({ ...detailsForm, nrf_fund: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Co-Investigators</label>
                      <textarea
                        value={detailsForm.co_investigators}
                        onChange={(e) => setDetailsForm({ ...detailsForm, co_investigators: e.target.value })}
                        rows={2}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        placeholder="List co-investigators separated by commas"
                      />
                    </div>
                  </div>

                  {/* Section 4: Research Team */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-purple-600" />
                      Research Team
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Female Researchers</label>
                        <input
                          type="number"
                          min="0"
                          value={detailsForm.female_researchers}
                          onChange={(e) => setDetailsForm({ ...detailsForm, female_researchers: parseInt(e.target.value) || 0 })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Male Researchers</label>
                        <input
                          type="number"
                          min="0"
                          value={detailsForm.male_researchers}
                          onChange={(e) => setDetailsForm({ ...detailsForm, male_researchers: parseInt(e.target.value) || 0 })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Status & Outcomes */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-orange-600" />
                      Status & Outcomes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Research Type</label>
                        <select
                          value={detailsForm.research_type}
                          onChange={(e) => setDetailsForm({ ...detailsForm, research_type: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="">Select Type</option>
                          <option value="AP">Applied (AP)</option>
                          <option value="BS">Basic (BS)</option>
                          <option value="EX">Experimental (EX)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Completion Status</label>
                        <select
                          value={detailsForm.completion_status}
                          onChange={(e) => setDetailsForm({ ...detailsForm, completion_status: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="">Select Status</option>
                          <option value="C">Completed (C)</option>
                          <option value="G">Ongoing (G)</option>
                          <option value="T">Terminated (T)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benefited Industry</label>
                        <input
                          type="text"
                          value={detailsForm.benefited_industry}
                          onChange={(e) => setDetailsForm({ ...detailsForm, benefited_industry: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ethical Clearance</label>
                        <select
                          value={detailsForm.ethical_clearance}
                          onChange={(e) => setDetailsForm({ ...detailsForm, ethical_clearance: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="N">No</option>
                          <option value="Y">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produced Prototype?</label>
                        <select
                          value={detailsForm.produced_prototype}
                          onChange={(e) => setDetailsForm({ ...detailsForm, produced_prototype: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="N">No</option>
                          <option value="Y">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HETRIL Collaboration?</label>
                        <select
                          value={detailsForm.hetril_collaboration}
                          onChange={(e) => setDetailsForm({ ...detailsForm, hetril_collaboration: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="N">No</option>
                          <option value="Y">Yes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Submitted to Incubator?</label>
                        <select
                          value={detailsForm.submitted_to_incubator}
                          onChange={(e) => setDetailsForm({ ...detailsForm, submitted_to_incubator: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        >
                          <option value="N">No</option>
                          <option value="Y">Yes</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="indigenous_knowledge"
                          checked={detailsForm.indigenous_knowledge}
                          onChange={(e) => setDetailsForm({ ...detailsForm, indigenous_knowledge: e.target.checked })}
                          className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="indigenous_knowledge" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Indigenous Knowledge
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setDetailsPaper(null)}
                      className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                    >
                      Save All Details
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }

      {
        showAuthorModal && selectedAuthor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 flex-shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 truncate mr-2">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex-shrink-0 flex items-center justify-center text-red-600 dark:text-red-400">
                    <UserIcon className="w-5 h-5 sm:w-6 sm:h-6" />
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
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gender</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedAuthor.author_gender || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date of Birth</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{selectedAuthor.author_date_of_birth || 'N/A'}</p>
                  </div>
                </div>

                {selectedAuthor.author_bio && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bio</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{selectedAuthor.author_bio}</p>
                  </div>
                )}

                <div className="pt-6 border-t dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowAuthorModal(false)}
                    className="order-2 sm:order-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const message = encodeURIComponent(`Hello ${selectedAuthor.author_name}, I am contacting you regarding your paper "${selectedAuthor.title}".`)
                      router.push(`/chat?userId=${selectedAuthor.author_id}&message=${message}`)
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
        )
      }

      {/* Review Modal */}
      {
        showReviewModal && selectedPaper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 flex-shrink-0">
                <h2 className="text-lg sm:text-xl font-semibold text-red-600 truncate mr-4">Review: {selectedPaper.title}</h2>
                <button onClick={() => setShowReviewModal(false)} className="text-gray-500 hover:text-gray-700 p-1">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="p-4 sm:p-6 overflow-y-auto">
                <form onSubmit={handleSubmitReview} className="space-y-6">
                  {/* Rating Sliders */}
                  {[
                    'Problem Statement',
                    'Literature Review',
                    'Methodology',
                    'Results',
                    'Conclusion',
                    'Originality',
                    'Clarity and Organization',
                    'Contribution to Knowledge',
                    'Technical Quality'
                  ].map((criteria) => {
                    const key = criteria.toLowerCase().replace(/ /g, '_') as keyof typeof reviewData;
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {criteria} ({(reviewData as any)[key]}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(reviewData as any)[key]}
                          onChange={(e) => setReviewData({ ...reviewData, [key]: parseInt(e.target.value) })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-red-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    )
                  })}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Overall Rating ({reviewData.rating}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={reviewData.rating}
                      onChange={(e) => setReviewData({ ...reviewData, rating: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-red-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recommendation
                    </label>
                    <select
                      value={reviewData.recommendation}
                      onChange={(e) => setReviewData({ ...reviewData, recommendation: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    >
                      <option value="accept">Recommend Acceptance</option>
                      <option value="minor_revision">Minor Revision</option>
                      <option value="major_revision">Major Revision</option>
                      <option value="reject">Recommend Rejection</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Comments</label>
                    <textarea
                      value={reviewData.comments}
                      onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md min-h-[100px]"
                      placeholder="Provide detailed feedback..."
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => setShowReviewModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Submit Review</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}
