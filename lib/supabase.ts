import { createClient } from '@supabase/supabase-js'

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV !== 'production') {
    // In development, allow the app to render even if Supabase isn't configured yet
    console.warn(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local for full functionality.'
    )
    // Use obvious dummy values so any Supabase calls still clearly fail
    supabaseUrl = 'https://demo.supabase.local'
    supabaseAnonKey = 'demo-anon-key-not-valid'
  } else {
    throw new Error('Missing Supabase environment variables')
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  name: string
  role: 'author' | 'editor' | 'admin' | 'coordinator'
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

// Auth helper functions
export async function signIn(email: string, password: string, role: string) {
  try {
    // First, sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) throw authError

    // Then check if user has the correct role in our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .single()

    if (userError) throw userError

    return {
      user: userData,
      session: authData.session,
      success: true
    }
  } catch (error) {
    console.error('Sign in error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Authentication failed' }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Sign out failed' }
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email || '')
      .single()

    if (error) throw error

    return userData
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

// Database helper functions
export async function getPapers() {
  try {
    const { data, error } = await supabase
      .from('papers')
      .select(`
        *,
        users!papers_author_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, success: true }
  } catch (error) {
    console.error('Get papers error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch papers' }
  }
}

export async function createPaper(paper: Omit<Paper, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .insert(paper)
      .select()
      .single()

    if (error) throw error
    return { data, success: true }
  } catch (error) {
    console.error('Create paper error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create paper' }
  }
}

export async function updatePaper(id: string, updates: Partial<Paper>) {
  try {
    const { data, error } = await supabase
      .from('papers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data, success: true }
  } catch (error) {
    console.error('Update paper error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update paper' }
  }
}

export async function deletePaper(id: string) {
  try {
    const { error } = await supabase
      .from('papers')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Delete paper error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete paper' }
  }
}

export async function getReviews(paperId?: string) {
  try {
    let query = supabase
      .from('reviews')
      .select(`
        *,
        users!reviews_reviewer_id_fkey (
          name,
          email
        ),
        papers!reviews_paper_id_fkey (
          title
        )
      `)

    if (paperId) {
      query = query.eq('paper_id', paperId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return { data, success: true }
  } catch (error) {
    console.error('Get reviews error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch reviews' }
  }
}

export async function createReview(review: Omit<Review, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single()

    if (error) throw error
    return { data, success: true }
  } catch (error) {
    console.error('Create review error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create review' }
  }
}

export async function getEvents() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        users!events_coordinator_id_fkey (
          name,
          email
        )
      `)
      .order('date', { ascending: true })

    if (error) throw error
    return { data, success: true }
  } catch (error) {
    console.error('Get events error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch events' }
  }
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single()

    if (error) throw error
    return { data, success: true }
  } catch (error) {
    console.error('Create event error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create event' }
  }
}

export async function updateEvent(id: string, updates: Partial<Event>) {
  try {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data, success: true }
  } catch (error) {
    console.error('Update event error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update event' }
  }
}

export async function deleteEvent(id: string) {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Delete event error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete event' }
  }
}
