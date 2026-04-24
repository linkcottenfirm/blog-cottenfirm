import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  return _client
}

// Backwards-compatible export — getter that initializes on first use
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as any)[prop]
  }
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
