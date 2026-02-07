'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, Newspaper, Plus, Search, Trash2, X, Edit2, CheckCircle, AlertCircle, TrendingUp, FileText, User as UserIcon, Mail, ThumbsUp, MessageCircle, Share2, Upload, Play, Heart } from 'lucide-react'
import { User, Event, Paper, News, getEvents, createEvent, updateEvent, deleteEvent, publishEvent, getPapers, updatePaperDetails, getNews, createNews, updateNews, deleteNews, publishNews, getEngagementStats, likePost, addComment, getComments, getPostLikes, uploadFile, EngagementStats, Comment } from '@/lib/api'
import Header from './Header'

interface CoordinatorDashboardProps {
  user: User
  onLogout: () => void
}

export default function CoordinatorDashboard({ user, onLogout }: CoordinatorDashboardProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [newEvent, setNewEvent] = useState({ title: '', description: '', category: 'Other', date: '', location: '', image_url: '', video_url: '' })

  // News state
  const [news, setNews] = useState<News[]>([])
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [editingNews, setEditingNews] = useState<News | null>(null)
  const [newsForm, setNewsForm] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'Research',
    image_url: '',
    video_url: ''
  })

  const [selectedAuthor, setSelectedAuthor] = useState<Paper | null>(null)
  const [showAuthorModal, setShowAuthorModal] = useState(false)
  const [showPromotionModal, setShowPromotionModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showLikesModal, setShowLikesModal] = useState(false)
  const [likesList, setLikesList] = useState<any[]>([])
  const [loadingLikes, setLoadingLikes] = useState(false)
  const [activeCommentsPost, setActiveCommentsPost] = useState<{ type: 'news' | 'event', id: string } | null>(null)
  const [commentsList, setCommentsList] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [engagementData, setEngagementData] = useState<Record<string, EngagementStats>>({})

  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')

  const fetchEngagementData = useCallback(async () => {
    const allPosts = [
      ...events.map(e => ({ id: e.id, type: 'event' as const })),
      ...news.map(n => ({ id: n.id, type: 'news' as const }))
    ]

    const stats: Record<string, EngagementStats> = {}
    await Promise.all(allPosts.map(async post => {
      const result = await getEngagementStats(post.type, post.id)
      if (result.success && result.data) {
        stats[`${post.type}-${post.id}`] = result.data
      }
    }))
    setEngagementData(stats)
  }, [events, news])

  const fetchData = useCallback(async () => {
    try {
      const [eventsResult, papersResult, newsResult] = await Promise.all([
        getEvents(),
        getPapers(),
        getNews()
      ])

      if (eventsResult.success && eventsResult.data) {
        const coordinatorEvents = eventsResult.data.filter((event: Event) =>
          event.coordinator_id === user.id
        )
        setEvents(coordinatorEvents)
      }

      if (papersResult.success && papersResult.data) {
        const approvedPapers = papersResult.data.filter((paper: Paper) =>
          paper.status === 'approved' || paper.status === 'published' || paper.status === 'recommended_for_publication'
        )
        setPapers(approvedPapers)
      }

      if (newsResult.success && newsResult.data) {
        setNews(newsResult.data)
      }

    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (events.length > 0 || news.length > 0) {
      fetchEngagementData()
    }
  }, [events.length, news.length, fetchEngagementData])

  // Handle hash navigation for deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash && hash.startsWith('#paper-')) {
        const paperId = hash.replace('#paper-', '')

        // For coordinators, papers are in the promotion modal
        const paper = papers.find(p => p.id === paperId)
        if (paper) {
          setShowPromotionModal(true)

          // Clear hash so it doesn't re-trigger
          window.history.replaceState(null, '', window.location.pathname + window.location.search)

          // Wait for modal to open and render
          setTimeout(() => {
            const element = document.getElementById(`paper-${paperId}`)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' })
              element.classList.add('ring-2', 'ring-red-500')
              setTimeout(() => element.classList.remove('ring-2', 'ring-red-500'), 3000)
            }
          }, 300) // Slightly longer delay for modal animation
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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newEvent.title && newEvent.date) {
      const dateObj = new Date(newEvent.date)
      if (isNaN(dateObj.getTime())) {
        alert('Invalid date selected')
        return
      }

      try {
        const eventData = {
          title: newEvent.title,
          description: newEvent.description,
          category: newEvent.category,
          date: dateObj.toISOString(),
          location: newEvent.location,
          image_url: newEvent.image_url,
          video_url: newEvent.video_url,
          coordinator_id: user.id
        }

        const result = await createEvent(eventData)
        if (result.success && result.data) {
          setEvents([result.data, ...events])
          setNewEvent({ title: '', description: '', category: 'Other', date: '', location: '', image_url: '', video_url: '' })
          setShowEventForm(false)
        }
      } catch (error) {
        console.error('Failed to create event:', error)
      }
    }
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingEvent && newEvent.title && newEvent.date) {
      const dateObj = new Date(newEvent.date)
      if (isNaN(dateObj.getTime())) {
        alert('Invalid date selected')
        return
      }

      try {
        const result = await updateEvent(editingEvent.id, {
          title: newEvent.title,
          description: newEvent.description,
          category: newEvent.category,
          date: dateObj.toISOString(),
          location: newEvent.location,
          image_url: newEvent.image_url,
          video_url: newEvent.video_url
        })

        if (result.success && result.data) {
          setEvents(events.map(event =>
            event.id === editingEvent.id ? result.data! : event
          ))
          setEditingEvent(null)
          setNewEvent({ title: '', description: '', category: 'Other', date: '', location: '', image_url: '', video_url: '' })
          setShowEventForm(false)
        }
      } catch (error) {
        console.error('Failed to update event:', error)
      }
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const result = await deleteEvent(eventId)
      if (result.success) {
        setEvents(events.filter(event => event.id !== eventId))
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const handlePublishEvent = async (eventId: string) => {
    try {
      const result = await publishEvent(eventId)
      if (result.success && result.data) {
        setEvents(events.map(event =>
          event.id === eventId ? result.data! : event
        ))
      }
    } catch (error) {
      console.error('Failed to publish event:', error)
    }
  }


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video', target: 'event' | 'news') => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadFile(file)
      if (result.success && result.data) {
        if (target === 'event') {
          setNewEvent({ ...newEvent, [type === 'image' ? 'image_url' : 'video_url']: result.data.url })
        } else {
          setNewsForm({ ...newsForm, [type === 'image' ? 'image_url' : 'video_url']: result.data.url })
        }
      } else {
        alert('Upload failed: ' + result.error)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('An error occurred during upload')
    } finally {
      setUploading(false)
    }
  }

  const handleShowLikes = async (type: 'news' | 'event', id: string) => {
    setLoadingLikes(true)
    setShowLikesModal(true)
    try {
      const result = await getPostLikes(type, id)
      if (result.success && result.data) {
        setLikesList(result.data.likes || [])
      }
    } catch (error) {
      console.error('Failed to load likes:', error)
    } finally {
      setLoadingLikes(false)
    }
  }

  const handleShowComments = async (type: 'news' | 'event', id: string) => {
    setLoadingComments(true)
    setActiveCommentsPost({ type, id })
    setShowPromotionModal(false) // Close promotion modal if open
    try {
      const result = await getComments(type, id)
      if (result.success && result.data) {
        setCommentsList(result.data.comments || [])
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !activeCommentsPost) return

    try {
      const result = await addComment(activeCommentsPost.type, activeCommentsPost.id, commentText)
      if (result.success && result.data) {
        setCommentsList([result.data.comment, ...commentsList])
        setCommentText('')
        fetchEngagementData()
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const handleLike = async (type: 'news' | 'event', id: string) => {
    try {
      const result = await likePost(type, id)
      if (result.success) {
        fetchEngagementData()
      }
    } catch (error) {
      console.error('Failed to like:', error)
    }
  }

  const handleCreateFromPaper = (paper: Paper, type: 'event' | 'news') => {
    setShowPromotionModal(false)
    if (type === 'event') {
      setNewEvent({
        title: paper.title,
        description: paper.abstract || '',
        category: 'Conference',
        date: '',
        location: '',
        image_url: '',
        video_url: ''
      })
      setShowEventForm(true)
    } else {
      setNewsForm({
        title: paper.title,
        summary: paper.abstract ? paper.abstract.substring(0, 150) + '...' : '',
        content: paper.abstract || '',
        category: 'Research',
        image_url: '',
        video_url: ''
      })
      setShowNewsForm(true)
    }
  }

  const startEditEvent = (event: Event) => {
    setEditingEvent(event)
    const dateStr = new Date(event.date).toISOString().slice(0, 16)

    setNewEvent({
      title: event.title,
      description: event.description || '',
      category: event.category || 'Other',
      date: dateStr,
      location: event.location || '',
      image_url: event.image_url || '',
      video_url: event.video_url || ''
    })
    setShowEventForm(true)
  }

  const cancelForm = () => {
    setShowEventForm(false)
    setEditingEvent(null)
    setNewEvent({ title: '', description: '', category: 'Other', date: '', location: '', image_url: '', video_url: '' })
  }

  const getEventStatus = (eventDate: string) => {
    const today = new Date()
    const event = new Date(eventDate)

    if (event < today) return 'past'
    if (event.toDateString() === today.toDateString()) return 'today'
    return 'upcoming'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'past': return 'bg-gray-100 text-gray-800'
      case 'today': return 'bg-green-100 text-green-800'
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // News handlers
  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createNews({
        ...newsForm
      })
      if (result.success && result.data) {
        setNews([result.data, ...news])
        setNewsForm({ title: '', summary: '', content: '', category: 'Research', image_url: '', video_url: '' })
        setShowNewsForm(false)
      }
    } catch (error) {
      console.error('Failed to create news:', error)
    }
  }

  const handleUpdateNews = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNews) return

    try {
      const result = await updateNews(editingNews.id, newsForm)
      if (result.success && result.data) {
        setNews(news.map(n => n.id === editingNews.id ? result.data! : n))
        setEditingNews(null)
        setNewsForm({ title: '', summary: '', content: '', category: 'Research', image_url: '', video_url: '' })
        setShowNewsForm(false)
      }
    } catch (error) {
      console.error('Failed to update news:', error)
    }
  }

  const handlePublishNews = async (id: string) => {
    try {
      const result = await publishNews(id)
      if (result.success && result.data) {
        setNews(news.map(n => n.id === id ? result.data! : n))
      }
    } catch (error) {
      console.error('Failed to publish news:', error)
    }
  }

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news post?')) return

    try {
      const result = await deleteNews(id)
      if (result.success) {
        setNews(news.filter(n => n.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete news:', error)
    }
  }

  const handleEditNewsClick = (newsItem: News) => {
    setEditingNews(newsItem)
    setNewsForm({
      title: newsItem.title,
      summary: newsItem.summary,
      content: newsItem.content,
      category: newsItem.category,
      image_url: newsItem.image_url || '',
      video_url: newsItem.video_url || ''
    })
    setShowNewsForm(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header user={user} title="Coordinator Dashboard" onLogout={onLogout} />

      <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-red-600">Events</h2>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowPromotionModal(true)}
                className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-900 transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Papers for Promotion ({papers.length})
              </button>
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              >
                <option value="All">All Categories</option>
                <option value="Conference">Conference</option>
                <option value="Workshop">Workshop</option>
                <option value="Seminar">Seminar</option>
                <option value="Thesis Defense">Thesis Defense</option>
                <option value="Other">Other</option>
              </select>
              <button
                onClick={() => setShowEventForm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                Create Event
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 p-6 pb-0">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-1">Total Events</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">{events.length}</h3>
                </div>
                <div className="p-2 bg-blue-200 dark:bg-blue-800/50 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-700 dark:text-blue-300" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-300 mb-1">Upcoming</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">
                    {events.filter(e => new Date(e.date) > new Date()).length}
                  </h3>
                </div>
                <div className="p-2 bg-green-200 dark:bg-green-800/50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-700 dark:text-green-300" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Past Events</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {events.filter(e => new Date(e.date) <= new Date()).length}
                  </h3>
                </div>
                <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg">
                  <Clock className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            {events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No events created yet</p>
                <button
                  onClick={() => setShowEventForm(true)}
                  className="mt-4 text-red-600 hover:text-red-700 font-medium"
                >
                  Create your first event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {events
                  .filter(event => {
                    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase())
                    const matchesCategory = filterCategory === 'All' || event.category === filterCategory
                    return matchesSearch && matchesCategory
                  })
                  .map(event => {
                    const status = getEventStatus(event.date)
                    return (
                      <div key={event.id} className="group bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
                        {/* Media Header */}
                        <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          {event.video_url ? (
                            <div className="relative w-full h-full">
                              <video
                                src={event.video_url}
                                className="w-full h-full object-cover"
                                controls
                              />
                            </div>
                          ) : event.image_url ? (
                            <img
                              src={event.image_url}
                              alt={event.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Calendar className="w-12 h-12 opacity-20" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm ${getStatusColor(status)}`}>
                              {status}
                            </span>
                          </div>
                          <div className="absolute bottom-3 left-3">
                            <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-red-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase shadow-sm">
                              {event.category || 'Other'}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 flex-grow flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-xl text-gray-900 dark:text-white leading-tight group-hover:text-red-600 transition-colors line-clamp-2">
                              {event.title}
                            </h3>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="w-4 h-4 mr-2 text-red-500" />
                              <span className="font-medium">{formatDate(event.date)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <span className="w-4 h-4 mr-2 flex items-center justify-center text-red-500">📍</span>
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            {event.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mt-3 leading-relaxed italic">
                                "{event.description}"
                              </p>
                            )}
                          </div>

                          {/* Social Interactions - Read Only in Dashboard */}
                          <div className="flex items-center justify-between py-3 border-t border-b dark:border-gray-700 mb-4">
                            <div
                              className={`flex items-center gap-1.5 text-xs font-medium ${engagementData[`event-${event.id}`]?.user_liked ? 'text-red-600' : 'text-gray-500'}`}
                            >
                              <Heart className={`w-4 h-4 ${engagementData[`event-${event.id}`]?.user_liked ? 'fill-current' : ''}`} />
                              <span>
                                {engagementData[`event-${event.id}`]?.likes_count || 0}
                              </span>
                            </div>
                            <div
                              className="flex items-center gap-1.5 text-gray-500 text-xs font-medium"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{engagementData[`event-${event.id}`]?.comments_count || 0} Comments</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                              <Share2 className="w-4 h-4" />
                              <span>{engagementData[`event-${event.id}`]?.shares_count || 0}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-auto">
                            {event.status !== 'published' && (
                              <button
                                onClick={() => handlePublishEvent(event.id)}
                                className="flex-1 text-xs font-bold bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                              >
                                Publish
                              </button>
                            )}
                            <button
                              onClick={() => startEditEvent(event)}
                              className="flex-1 text-xs font-bold border-2 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-95 border-2 border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

        {/* News Management Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold text-red-600">News & Updates</h2>
            <button
              onClick={() => setShowNewsForm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              Post News
            </button>
          </div>
          <div className="p-4 sm:p-6">
            {news.length === 0 ? (
              <div className="text-center py-8">
                <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No news posted yet</p>
                <button
                  onClick={() => setShowNewsForm(true)}
                  className="mt-4 text-red-600 hover:text-red-700 font-medium"
                >
                  Create your first news post
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {news.map(item => (
                  <div key={item.id} className="group bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
                    {/* Media Header */}
                    <div className="relative h-48 w-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                      {item.video_url ? (
                        <video
                          src={item.video_url}
                          className="w-full h-full object-cover"
                          controls
                        />
                      ) : item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Newspaper className="w-12 h-12 opacity-20" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm ${item.status === 'published'
                          ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                          {item.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-red-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase shadow-sm">
                          {item.category || 'General'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-grow flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white leading-tight group-hover:text-red-600 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3 mr-1 text-red-500" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mt-2 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>

                      {/* Social Interactions - Read Only in Dashboard */}
                      <div className="flex items-center justify-between py-3 border-t border-b dark:border-gray-700 mb-4">
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium ${engagementData[`news-${item.id}`]?.user_liked ? 'text-red-600' : 'text-gray-500'}`}
                        >
                          <Heart className={`w-4 h-4 ${engagementData[`news-${item.id}`]?.user_liked ? 'fill-current' : ''}`} />
                          <span>
                            {engagementData[`news-${item.id}`]?.likes_count || 0}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1.5 text-gray-500 text-xs font-medium"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{engagementData[`news-${item.id}`]?.comments_count || 0} Comments</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
                          <Share2 className="w-4 h-4" />
                          <span>{engagementData[`news-${item.id}`]?.shares_count || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-auto">
                        {item.status !== 'published' && (
                          <button
                            onClick={() => handlePublishNews(item.id)}
                            className="flex-1 text-xs font-bold bg-green-600 text-white py-2.5 rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleEditNewsClick(item)}
                          className="flex-1 text-xs font-bold border-2 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNews(item.id)}
                          className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-95 border-2 border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Promotion Modal */}
        {
          showPromotionModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-red-600">Papers Ready for Promotion</h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Create events or news posts based on submitted papers.</p>
                  </div>
                  <button onClick={() => setShowPromotionModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1">
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
                <div className="p-3 sm:p-6 overflow-y-auto">
                  {papers.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 text-lg">No papers available for promotion</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {papers.map(paper => (
                        <div key={paper.id} id={`paper-${paper.id}`} className="border dark:border-gray-700 rounded-xl p-5 hover:border-red-500 transition-all bg-gray-50 dark:bg-gray-750">
                          <div className="flex flex-col h-full">
                            <div className="mb-4">
                              <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-2 mb-2">{paper.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <UserIcon className="w-4 h-4" />
                                {paper.author_name || 'Unknown Author'}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-auto pt-4 border-t dark:border-gray-700">
                              <button
                                onClick={() => handleCreateFromPaper(paper, 'event')}
                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm font-bold flex items-center justify-center gap-2"
                              >
                                <Calendar className="w-4 h-4" />
                                Event
                              </button>
                              <button
                                onClick={() => handleCreateFromPaper(paper, 'news')}
                                className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-all text-sm font-bold flex items-center justify-center gap-2"
                              >
                                <Newspaper className="w-4 h-4" />
                                News
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        {/* Event Modal */}
        {
          showEventForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-red-600">
                    {editingEvent ? 'Edit Event' : 'Create New Event'}
                  </h2>
                  <button onClick={cancelForm} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1">
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto">
                  <form onSubmit={editingEvent ? handleUpdateEvent : handleCreateEvent} className="space-y-4">
                    <div>
                      <label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Event Title
                      </label>
                      <input
                        id="eventTitle"
                        type="text"
                        value={newEvent.title}
                        onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        placeholder="Enter event title"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="eventCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        id="eventCategory"
                        value={newEvent.category}
                        onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Conference">Conference</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Seminar">Seminar</option>
                        <option value="Thesis Defense">Thesis Defense</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date & Time
                      </label>
                      <input
                        id="eventDate"
                        type="datetime-local"
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="eventLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        id="eventLocation"
                        type="text"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        placeholder="Enter event location"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        id="eventDescription"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Enter event description"
                        rows={4}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="eventImage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Image URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="eventImage"
                            type="url"
                            value={newEvent.image_url}
                            onChange={(e) => setNewEvent({ ...newEvent, image_url: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                          <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">
                            <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image', 'event')} disabled={uploading} />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="eventVideo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Video URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="eventVideo"
                            type="url"
                            value={newEvent.video_url}
                            onChange={(e) => setNewEvent({ ...newEvent, video_url: e.target.value })}
                            placeholder="https://example.com/video.mp4"
                            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                          <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">
                            <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <input type="file" className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, 'video', 'event')} disabled={uploading} />
                          </label>
                        </div>
                      </div>
                    </div>
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Uploading file...
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
                      <button
                        type="button"
                        onClick={cancelForm}
                        className="order-2 sm:order-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="order-1 sm:order-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
                      >
                        {editingEvent ? 'Update Event' : 'Create Event'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )
        }

        {/* News Modal */}
        {
          showNewsForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-red-600">
                    {editingNews ? 'Edit News Post' : 'Create News Post'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowNewsForm(false)
                      setEditingNews(null)
                      setNewsForm({ title: '', summary: '', content: '', category: 'Research', image_url: '', video_url: '' })
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
                <div className="p-4 sm:p-6 overflow-y-auto">
                  <form onSubmit={editingNews ? handleUpdateNews : handleCreateNews} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newsForm.title}
                        onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={newsForm.category}
                        onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="Research">Research</option>
                        <option value="Academic">Academic</option>
                        <option value="Event">Event</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Summary
                      </label>
                      <textarea
                        value={newsForm.summary}
                        onChange={(e) => setNewsForm({ ...newsForm, summary: e.target.value })}
                        rows={3}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Content
                      </label>
                      <textarea
                        value={newsForm.content}
                        onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                        rows={6}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Image URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={newsForm.image_url}
                            onChange={(e) => setNewsForm({ ...newsForm, image_url: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                          <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">
                            <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image', 'news')} disabled={uploading} />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Video URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={newsForm.video_url}
                            onChange={(e) => setNewsForm({ ...newsForm, video_url: e.target.value })}
                            placeholder="https://example.com/video.mp4"
                            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                          <label className="cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">
                            <Upload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <input type="file" className="hidden" accept="video/*" onChange={(e) => handleFileUpload(e, 'video', 'news')} disabled={uploading} />
                          </label>
                        </div>
                      </div>
                    </div>
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        Uploading file...
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewsForm(false)
                          setEditingNews(null)
                          setNewsForm({ title: '', summary: '', content: '', category: 'Research', image_url: '', video_url: '' })
                        }}
                        className="order-2 sm:order-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="order-1 sm:order-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
                      >
                        {editingNews ? 'Update News' : 'Create News'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )
        }
        {/* Likes Modal */}
        {
          showLikesModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                  <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-500 fill-current" />
                    Liked by
                  </h3>
                  <button onClick={() => setShowLikesModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {loadingLikes ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : likesList.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No likes yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {likesList.map((like) => (
                        <div key={like.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-all">
                          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold">
                            {like.user_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white">{like.user_name}</p>
                            <p className="text-xs text-gray-400">{new Date(like.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        {/* Comments Modal */}
        {
          activeCommentsPost && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-3 sm:p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                  <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-red-500" />
                    Comments
                  </h3>
                  <button onClick={() => setActiveCommentsPost(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 sm:p-6 flex flex-col h-[500px]">
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4 custom-scrollbar pr-2">
                    {loadingComments ? (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : commentsList.length === 0 ? (
                      <p className="text-center text-gray-500 py-8 italic">No comments yet. Be the first to comment!</p>
                    ) : (
                      commentsList.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs flex-shrink-0">
                            {comment.user_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-2xl px-4 py-2">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm text-gray-900 dark:text-white">{comment.user_name}</span>
                              <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <form onSubmit={handleAddComment} className="flex gap-2 pt-4 border-t dark:border-gray-700">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 bg-gray-100 dark:bg-gray-700 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-red-500 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  )
}
