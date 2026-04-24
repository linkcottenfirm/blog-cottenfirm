import Link from 'next/link'
import { supabaseAdmin, AdminBlogPost } from '@/lib/supabase-admin'

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

function fmtDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

      <Section title="Drafts" emptyMsg="No drafts. Generate articles via Arvow to see them here." posts={drafts} />
      <Section title="Published" emptyMsg="No published posts yet." posts={published} />
    </div>
  )
}

function Section({ title, emptyMsg, posts }: { title: string; emptyMsg: string; posts: Awaited<ReturnType<typeof fetchPosts>> }) {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">{title} ({posts.length})</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-gray-500 italic bg-white border border-gray-200 rounded p-4">{emptyMsg}</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Title</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Created</th>
                <th className="text-left px-4 py-2">Updated</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/${p.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                      {p.title}
                    </Link>
                    <div className="text-xs text-gray-500 font-mono">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(p.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/${p.id}`} className="text-sm text-gray-700 hover:text-indigo-600">Edit →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
