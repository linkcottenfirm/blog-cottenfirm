import { supabaseAdmin, AdminBlogPost } from '@/lib/supabase-admin'
import { BulkSection } from './BulkActions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchPosts(): Promise<Pick<AdminBlogPost, 'id' | 'slug' | 'title' | 'category' | 'published' | 'created_at' | 'updated_at'>[]> {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('id, slug, title, category, published, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('admin/page fetchPosts error:', error)
    return []
  }
  return data || []
}

export default async function AdminHome() {
  const posts = await fetchPosts()
  const drafts = posts.filter(p => !p.published)
  const published = posts.filter(p => p.published)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All posts</h1>
          <p className="text-sm text-gray-500 mt-1">
            {drafts.length} drafts · {published.length} published · {posts.length} total
          </p>
        </div>
      </div>

      <BulkSection
        title="Drafts"
        posts={drafts}
        emptyMsg="No drafts. Generate articles via Arvow to see them here."
      />
      <BulkSection
        title="Published"
        posts={published}
        emptyMsg="No published posts yet."
      />
    </div>
  )
}
