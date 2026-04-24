import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!serviceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
}

// Admin Supabase client — uses the service role key (bypasses RLS).
// Only ever import this from server components, route handlers, or server actions.
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export interface AdminBlogPost {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  meta_description: string | null
  published: boolean
  published_at: string | null
  created_at: string
  updated_at: string | null
  category: string | null
  tags: string[] | null
  author: string
  featured_image: string | null
}
