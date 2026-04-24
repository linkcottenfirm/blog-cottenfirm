import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface BlogPost {
  id: string
  slug: string
  title: string
  content: string
  excerpt: string | null
  meta_description: string | null
  published?: boolean
  published_at: string | null
  created_at: string
  category: string | null
  tags: string[] | null
  author: string
  featured_image: string | null
}

export async function getAllPosts(): Promise<Omit<BlogPost, 'content'>[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, meta_description, published_at, created_at, category, tags, author, featured_image')
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  return data || []
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error) return null
  return data
}
