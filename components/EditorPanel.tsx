'use client'

import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { User, Paper, Review, getPapers, getReviews, createReview } from '@/lib/api'
import Header from './Header'

interface EditorPanelProps {
  user: User
  onLogout: () => void
}

export default function EditorPanel({ user, onLogout }: EditorPanelProps) {
  const [papers, setPapers] = useState<Paper[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [reviewData, setReviewData] = useState({ rating: 5, comments: '', recommendation: 'accept' as const })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const papersResult = await getPapers()
      const reviewsResult = await getReviews()

      if (papersResult.success && papersResult.data) {
        // Filter submitted papers that need review
        const submittedPapers = papersResult.data.filter((paper: Paper) =>
          paper.status === 'submitted' || paper.status === 'under_review'
        )
        setPapers(submittedPapers)
      }

      if (reviewsResult.success && reviewsResult.data) {
        setReviews(reviewsResult.data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
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
          comments: reviewData.comments,
          recommendation: reviewData.recommendation
        }

        const result = await createReview(reviewDataSubmit)
        if (result.success) {
          // Update papers list to remove reviewed paper
          setPapers(papers.filter(p => p.id !== selectedPaper.id))
          setSelectedPaper(null)
          setReviewData({ rating: 5, comments: '', recommendation: 'accept' })
        }
      } catch (error) {
        console.error('Failed to submit review:', error)
      }
    }
  }

  const getPaperStatus = (paper: Paper) => {
    const existingReview = reviews.find(r => r.paper_id === paper.id && r.reviewer_id === user.id)
    return existingReview ? 'reviewed' : 'pending'
  }

  const getExistingReview = (paper: Paper) => {
    return reviews.find(r => r.paper_id === paper.id && r.reviewer_id === user.id)
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'accept': return 'bg-green-100 text-green-800'
      case 'minor_revision': return 'bg-yellow-100 text-yellow-800'
      case 'major_revision': return 'bg-orange-100 text-orange-800'
      case 'reject': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatRecommendation = (recommendation: string) => {
    return recommendation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

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

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-red-600">Papers for Review</h2>
            </div>
            <div className="p-6">
              {papers.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No papers assigned for review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {papers.map(paper => {
                    const status = getPaperStatus(paper)
                    const existingReview = getExistingReview(paper)

                    return (
                      <div key={paper.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold dark:text-white">{paper.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Author: {paper.author_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Email: {paper.author_email || 'Unknown'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Submitted: {new Date(paper.created_at).toLocaleDateString()}</p>
                            {paper.abstract && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">{paper.abstract}</p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm ${status === 'reviewed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {status === 'reviewed' ? 'Reviewed' : 'Pending'}
                          </span>
                        </div>

                        {existingReview && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-medium dark:text-white">Rating: {existingReview.rating}/5</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{existingReview.comments}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs ${getRecommendationColor(existingReview.recommendation)}`}>
                                {formatRecommendation(existingReview.recommendation)}
                              </span>
                            </div>
                          </div>
                        )}

                        {status === 'pending' && (
                          <button
                            onClick={() => setSelectedPaper(paper)}
                            className="mt-3 bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            Review Paper
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedPaper && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-6 border-b dark:border-gray-700">
                <h2 className="text-xl font-semibold text-red-600">Review: {selectedPaper.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Author: {selectedPaper.author_name || 'Unknown'}</p>
              </div>
              <div className="p-6">
                {selectedPaper.abstract && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Abstract</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">{selectedPaper.abstract}</p>
                  </div>
                )}

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div>
                    <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rating (1-5)
                    </label>
                    <select
                      id="rating"
                      value={reviewData.rating}
                      onChange={(e) => setReviewData({ ...reviewData, rating: parseInt(e.target.value) })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      {[1, 2, 3, 4, 5].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="recommendation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recommendation
                    </label>
                    <select
                      id="recommendation"
                      value={reviewData.recommendation}
                      onChange={(e) => setReviewData({ ...reviewData, recommendation: e.target.value as any })}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="accept">Accept</option>
                      <option value="minor_revision">Minor Revision</option>
                      <option value="major_revision">Major Revision</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="comments" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Comments
                    </label>
                    <textarea
                      id="comments"
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md min-h-[120px] focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      value={reviewData.comments}
                      onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                      placeholder="Provide detailed feedback..."
                      required
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Submit Review
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaper(null)}
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
      </div>
    </div>
  )
}
