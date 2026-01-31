export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'

export interface User {
    id: string
    email: string
    name: string
    role: 'author' | 'editor' | 'admin' | 'coordinator'
    avatar?: string
    bio?: string
    preferences?: Record<string, any>
    date_of_birth?: string
    created_at: string
    updated_at: string
}

export interface Paper {
    id: string
    title: string
    abstract?: string
    content?: string
    author_id: string
    status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'recommended_for_publication' | 'published'
    type?: string
    created_at: string
    updated_at: string
    author_name?: string
    author_email?: string
    author_academic_year?: string
    author_author_type?: string
    author_author_category?: string
    author_academic_rank?: string
    author_qualification?: string
    author_employment_type?: string
    author_gender?: string
    author_date_of_birth?: string
    author_bio?: string
    author_avatar?: string
    file_url?: string
    // Editor Submission Fields
    institution_code?: string
    publication_id?: string
    publication_isced_band?: string
    publication_title_amharic?: string
    publication_date?: string
    publication_type?: string
    journal_type?: string
    journal_name?: string
    indigenous_knowledge?: boolean
    // Research Project Fields
    fiscal_year?: string
    allocated_budget?: number
    external_budget?: number
    nrf_fund?: number
    research_type?: string
    completion_status?: string
    female_researchers?: number
    male_researchers?: number
    outside_female_researchers?: number
    outside_male_researchers?: number
    benefited_industry?: string
    ethical_clearance?: string
    pi_name?: string
    pi_gender?: string
    co_investigators?: string
    produced_prototype?: string
    hetril_collaboration?: string
    submitted_to_incubator?: string
}

export interface Notification {
    id: number
    user_id: string
    message: string
    is_read: boolean
    created_at: string
    paper_id?: string
}

export interface Review {
    id: string
    paper_id: string
    reviewer_id: string
    rating: number
    problem_statement?: number
    literature_review?: number
    methodology?: number
    results?: number
    conclusion?: number
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
    category?: string
    status?: string
    image_url?: string
    video_url?: string
    date: string
    location?: string
    coordinator_id?: string
    created_at?: string
    updated_at?: string
}

export interface News {
    id: string
    title: string
    summary: string
    content: string
    category: string
    status: string
    image_url?: string
    video_url?: string
    editor_id: string
    created_at: string
    updated_at: string
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
    avatar?: string
    unread_count?: number
    last_message?: {
        content?: string
        attachment_url?: string
    }
}

export interface Comment {
    id: string
    post_id: string
    post_type: 'news' | 'event'
    user_id: string
    user_name: string
    user_avatar?: string
    content: string
    created_at: string
}

export interface EngagementStats {
    likes_count: number
    comments_count: number
    shares_count: number
    user_liked: boolean
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
export async function signUp(data: Record<string, any>) {
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

export async function verifyEmail(email: string, code: string) {
    return request<{ user: User }>('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
    })
}

export async function resendVerificationCode(email: string) {
    return request('/auth/resend-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
    })
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

export async function recommendPaper(id: string) {
    return request<Paper>(`/papers/${id}/recommend`, {
        method: 'POST',
    })
}

export async function updatePaperDetails(id: string, details: Partial<Paper>) {
    return request<Paper>(`/papers/${id}/details`, {
        method: 'PUT',
        body: JSON.stringify(details),
    })
}

export async function deletePaper(id: string) {
    return request(`/papers/${id}`, {
        method: 'DELETE',
    })
}

export async function recommendPaperForPublication(id: string) {
    return request<Paper>(`/papers/${id}/recommend`, {
        method: 'POST'
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
export async function getEvents(status?: string) {
    const query = status ? `?status=${status}` : ''
    return request<Event[]>(`/events${query}`)
}

export async function publishEvent(id: string) {
    return request<Event>(`/events/${id}/publish`, {
        method: 'PUT',
    })
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

// News
export async function getNews(status?: string) {
    const query = status ? `?status=${status}` : ''
    return request<News[]>(`/news${query}`)
}

export async function createNews(news: Omit<News, 'id' | 'editor_id' | 'status' | 'created_at' | 'updated_at'>) {
    return request<News>('/news', {
        method: 'POST',
        body: JSON.stringify(news),
    })
}

export async function updateNews(id: string, updates: Partial<News>) {
    return request<News>(`/news/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    })
}

export async function deleteNews(id: string) {
    return request(`/news/${id}`, {
        method: 'DELETE',
    })
}

export async function publishNews(id: string) {
    return request<News>(`/news/${id}/publish`, {
        method: 'PUT',
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

export async function getNotifications() {
    return request<Notification[]>(`/notifications?t=${Date.now()}`)
}

export async function markNotificationRead(id: number) {
    return request(`/notifications/${id}/read`, {
        method: 'PUT'
    })
}

export async function uploadFile(file: File) {
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

export async function getAdminUser() {
    return request<{ id: string; email: string; name: string; role: string }>('/users/admin')
}

export async function createNotification(userId: string, message: string, paperId?: string) {
    return request<Notification>('/notifications', {
        method: 'POST',
        body: JSON.stringify({
            user_id: userId,
            message,
            paper_id: paperId
        })
    })
}

// Social Features
export async function likePost(postType: 'news' | 'event', postId: string) {
    return request<{ liked: boolean }>('/interactions/like', {
        method: 'POST',
        body: JSON.stringify({ post_type: postType, post_id: postId })
    })
}

export async function getPostLikes(postType: 'news' | 'event', postId: string) {
    return request<{ likes: any[]; count: number }>(`/interactions/likes/${postType}/${postId}`)
}

export async function addComment(postType: 'news' | 'event', postId: string, content: string) {
    return request<{ message: string; comment: Comment }>('/interactions/comment', {
        method: 'POST',
        body: JSON.stringify({ post_type: postType, post_id: postId, content })
    })
}

export async function getComments(postType: 'news' | 'event', postId: string) {
    return request<{ comments: Comment[]; count: number }>(`/interactions/comments/${postType}/${postId}`)
}

export async function shareToMessage(postType: 'news' | 'event', postId: string, receiverId: string, message?: string) {
    return request<{ success: boolean }>('/interactions/share', {
        method: 'POST',
        body: JSON.stringify({
            post_type: postType,
            post_id: postId,
            recipient_id: receiverId,
            message_text: message
        })
    })
}

export async function getEngagementStats(postType: 'news' | 'event', postId: string) {
    return request<EngagementStats>(`/interactions/stats/${postType}/${postId}`)
}

export async function createAdminUser(data: { email: string; password: string; name: string; role: 'editor' | 'coordinator' }) {
    return request<User>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
    })
}

export async function getAdminStaff() {
    return request<{ id: string; email: string; name: string; role: string; created_at: string; is_verified: boolean }[]>('/admin/staff')
}
