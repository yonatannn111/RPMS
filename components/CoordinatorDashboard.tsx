'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { User, Event, getEvents, createEvent, updateEvent, deleteEvent } from '@/lib/api'
import Header from './Header'

interface CoordinatorDashboardProps {
  user: User
  onLogout: () => void
}

export default function CoordinatorDashboard({ user, onLogout }: CoordinatorDashboardProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const result = await getEvents()
      if (result.success && result.data) {
        // Filter events for current coordinator
        const coordinatorEvents = result.data.filter((event: Event) =>
          event.coordinator_id === user.id
        )
        setEvents(coordinatorEvents)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newEvent.title && newEvent.date) {
      try {
        const eventData = {
          title: newEvent.title,
          description: newEvent.description,
          date: newEvent.date,
          location: newEvent.location,
          coordinator_id: user.id
        }

        const result = await createEvent(eventData)
        if (result.success && result.data) {
          setEvents([result.data, ...events])
          setNewEvent({ title: '', description: '', date: '', location: '' })
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
      try {
        const result = await updateEvent(editingEvent.id, {
          title: newEvent.title,
          description: newEvent.description,
          date: newEvent.date,
          location: newEvent.location
        })

        if (result.success && result.data) {
          setEvents(events.map(event =>
            event.id === editingEvent.id ? result.data! : event
          ))
          setEditingEvent(null)
          setNewEvent({ title: '', description: '', date: '', location: '' })
        }
      } catch (error) {
        console.error('Failed to update event:', error)
      }
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const result = await deleteEvent(eventId)
      if (result.success) {
        setEvents(events.filter(event => event.id !== eventId))
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const startEditEvent = (event: Event) => {
    setEditingEvent(event)
    setNewEvent({
      title: event.title,
      description: event.description || '',
      date: event.date,
      location: event.location || ''
    })
    setShowEventForm(true)
  }

  const cancelForm = () => {
    setShowEventForm(false)
    setEditingEvent(null)
    setNewEvent({ title: '', description: '', date: '', location: '' })
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

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-red-600">Events</h2>
            <button
              onClick={() => setShowEventForm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Create Event
            </button>
          </div>
          <div className="p-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map(event => {
                  const status = getEventStatus(event.date)
                  return (
                    <div key={event.id} className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg dark:text-white">{event.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 mb-3">
                        <p className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(event.date)}
                        </p>
                        {event.location && (
                          <p className="flex items-center">
                            <span className="w-4 h-4 mr-2">📍</span>
                            {event.location}
                          </p>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">{event.description}</p>
                      )}

                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEditEvent(event)}
                          className="text-sm border border-gray-300 dark:border-gray-600 px-3 py-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="text-sm border border-red-300 text-red-600 px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {showEventForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-red-600">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
            </div>
            <div className="p-6">
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
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelForm}
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
  )
}
