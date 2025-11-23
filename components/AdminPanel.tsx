'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { User, Paper, Review, getPapers, getReviews, updatePaper } from '@/lib/api'
import Header from './Header'

interface AdminPanelProps {
  user: User
  onLogout: () => void
}

interface PaperWithReviews extends Paper {
  reviews: Review[]
}

export default function AdminPanel({ user, onLogout }: AdminPanelProps) {
  const [papers, setPapers] = useState<PaperWithReviews[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const papersResult = await getPapers()
      const reviewsResult = await getReviews()

      if (papersResult.success && papersResult.data) {
        // Get papers that are ready for admin approval (have reviews)
        const papersWithReviews = papersResult.data.map((paper: Paper) => {
          const paperReviews = reviewsResult.data?.filter((review: Review) =>
            review.paper_id === paper.id
          ) || []

          return {
            ...paper,
            reviews: paperReviews
          }
        }).filter((paper: PaperWithReviews) =>
          paper.status === 'under_review' && paper.reviews.length > 0
        )

        setPapers(papersWithReviews)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (paperId: string, approved: boolean) => {
    try {
      const result = await updatePaper(paperId, {
        status: approved ? 'approved' : 'rejected'
      })

      if (result.success) {
        setPapers(papers.filter(paper => paper.id !== paperId))
      }
    } catch (error) {
      console.error('Failed to update paper status:', error)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} title="Admin Panel" onLogout={onLogout} />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-red-600">System Overview</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900">Total Papers</h3>
                <p className="text-2xl font-bold text-blue-600">{papers.length}</p>
                <p className="text-sm text-blue-700">Ready for approval</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-900">Avg Review Score</h3>
                <p className="text-2xl font-bold text-green-600">
                  {papers.length > 0 ? getAverageScore(papers.flatMap(p => p.reviews)) : '0'}
                </p>
                <p className="text-sm text-green-700">Across all papers</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-medium text-purple-900">Total Reviews</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {papers.reduce((acc, paper) => acc + paper.reviews.length, 0)}
                </p>
                <p className="text-sm text-purple-700">Completed reviews</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-red-600">Paper Approval</h2>
          </div>
          <div className="p-6">
            {papers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No papers pending approval</p>
              </div>
            ) : (
              <div className="space-y-4">
                {papers.map(paper => (
                  <div key={paper.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{paper.title}</h3>
                        <p className="text-sm text-gray-600">Author: {paper.author_name || 'Unknown'}</p>
                        <p className="text-sm text-gray-600">Submitted: {new Date(paper.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {paper.reviews.length} Review{paper.reviews.length !== 1 ? 's' : ''}
                        </span>
                        <p className="text-lg font-bold text-blue-600">
                          {getAverageScore(paper.reviews)}/5
                        </p>
                      </div>
                    </div>

                    {paper.abstract && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{paper.abstract}</p>
                    )}

                    <div className="bg-gray-50 p-3 rounded mb-3">
                      <p className="text-sm font-medium mb-2">Review Summary:</p>
                      <p className="text-sm text-gray-600">{getRecommendationSummary(paper.reviews)}</p>
                      <div className="mt-2 space-y-1">
                        {paper.reviews.map((review, index) => (
                          <div key={review.id} className="text-xs text-gray-600">
                            <span className="font-medium">Reviewer {index + 1}:</span> {review.comments ? review.comments.substring(0, 100) + '...' : ''}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApproval(paper.id, true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(paper.id, false)}
                        className="border border-red-600 text-red-600 px-4 py-2 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
