const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

export interface User {
    id: string
    email: string
    name: string
    role: 'author' | 'editor' | 'admin' | 'coordinator'
    avatar?: string
    bio?: string
    preferences?: Record<string, any>
    created_at: string
    updated_at: string
}

export interface Paper {
    id: string
    title: string
    abstract?: string
    content?: string
    author_id: string
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'published'
    created_at: string
    updated_at: string
    author_name?: string
    author_email?: string
}

export interface Review {
    id: string
    paper_id: string
    reviewer_id: string
    rating: number
    comments?: string
    recommendation: 'accept' | 'minor_revision' | 'major_revision' | 'reject'
    created_at: string
    updated_at: string
    reviewer_name?: string
    reviewer_email?: string
    paper_title?: string
}

export interface Event {
    id: string
    title: string
    description?: string
    date: string
    location?: string
    coordinator_id: string
    created_at: string
    updated_at: string
    coordinator_name?: string
    coordinator_email?: string
}

export interface Message {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    attachment_url?: string
    attachment_name?: string
    attachment_type?: string
    attachment_size?: number
    reply_to_message_id?: string
    is_forwarded: boolean
    is_read: boolean
    created_at: string
    sender_name?: string
    receiver_name?: string
}

export interface Contact {
    id: string
    name: string
    email: string
    role: string
    avatar: string
    unread_count: number
    last_message?: {
        content: string
        attachment_url?: string
        created_at: string
    }
}

// Helper to get auth header
const getAuthHeader = () => {
    const token = localStorage.getItem('authToken')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
}

// Helper for requests
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<{ data?: T; success: boolean; error?: string }> {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
            ...options.headers,
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        })

        let data
        try {
            data = await response.json()
        } catch (e) {
            // If response is not JSON (e.g. 500 error page or empty body)
            if (!response.ok) {
                return { success: false, error: `Server error (${response.status})` }
            }
            throw e
        }

        if (!response.ok) {
            return { success: false, error: data.error || 'An error occurred' }
        }

        return { data, success: true }
    } catch (error) {
        console.error(`API request failed for ${endpoint}:`, error)
        return { success: false, error: error instanceof Error ? error.message : 'Network error' }
    }
}

// Auth
export async function signUp(data: { email: string; password: string; name: string; role: string }) {
    const result = await request<{ user: User; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    })

    if (result.success && result.data) {
        localStorage.setItem('authToken', result.data.token)
        return { user: result.data.user, success: true }
    }

    return { success: false, error: result.error }
}

export async function signIn(email: string, password: string) {
    const result = await request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    })

    if (result.success && result.data) {
        localStorage.setItem('authToken', result.data.token)
        return { user: result.data.user, success: true }
    }

    return { success: false, error: result.error }
}

export async function signOut() {
    localStorage.removeItem('authToken')
    return { success: true }
}

export async function getCurrentUser() {
    const result = await request<User>('/profile')
    if (result.success) {
        return result.data
    }
    return null
}

export async function updateProfile(data: Partial<User>) {
    return request<User>('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    })
}

export async function changePassword(data: { old_password: string; new_password: string }) {
    return request('/auth/password', {
        method: 'PUT',
        body: JSON.stringify(data),
    })
}

export async function deleteAccount() {
    return request('/auth/account', {
        method: 'DELETE',
    })
}

// Papers
export async function getPapers() {
    return request<Paper[]>('/papers')
}

export async function createPaper(paper: Omit<Paper, 'id' | 'created_at' | 'updated_at'>) {
    return request<Paper>('/papers', {
        method: 'POST',
        body: JSON.stringify(paper),
    })
}

export async function updatePaper(id: string, updates: Partial<Paper>) {
    return request<Paper>(`/papers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    })
}

export async function deletePaper(id: string) {
    return request(`/papers/${id}`, {
        method: 'DELETE',
    })
}

// Reviews
export async function getReviews(paperId?: string) {
    const query = paperId ? `?paper_id=${paperId}` : ''
    return request<Review[]>(`/reviews${query}`)
}

export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) {
    return request<Review>('/reviews', {
        method: 'POST',
        body: JSON.stringify(review),
    })
}

// Events
export async function getEvents() {
    return request<Event[]>('/events')
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
    return request<Event>('/events', {
        method: 'POST',
        body: JSON.stringify(event),
    })
}

export async function updateEvent(id: string, updates: Partial<Event>) {
    return request<Event>(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    })
}

export async function deleteEvent(id: string) {
    return request(`/events/${id}`, {
        method: 'DELETE',
    })
}


// Chat
export async function getContacts() {
    return request<Contact[]>('/chat/contacts')
}

export async function getMessages(contactId: string) {
    return request<Message[]>(`/chat/messages?contact_id=${contactId}`)
}

export async function sendMessage(
    receiverId: string,
    content: string,
    attachmentUrl?: string,
    attachmentName?: string,
    attachmentType?: string,
    attachmentSize?: number,
    replyToMessageId?: string,
    isForwarded?: boolean
) {
    return request<Message>('/chat/send', {
        method: 'POST',
        body: JSON.stringify({
            receiver_id: receiverId,
            content,
            attachment_url: attachmentUrl,
            attachment_name: attachmentName,
            attachment_type: attachmentType,
            attachment_size: attachmentSize,
            reply_to_message_id: replyToMessageId,
            is_forwarded: isForwarded
        }),
    })
}

export async function uploadChatFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const token = localStorage.getItem('authToken')
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

    const response = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: 'POST',
        headers,
        body: formData
    })

    const data = await response.json()

    if (!response.ok) {
        return { success: false, error: data.error || 'Upload failed' }
    }

    return { success: true, data }
}

export async function getUnreadCount() {
    return request<{ count: number }>('/chat/unread-count')
}
