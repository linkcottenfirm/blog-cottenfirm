import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin, AdminBlogPost } from '@/lib/supabase-admin'
import { EditForm } from './EditForm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchPost(id: string): Promise<AdminBlogPost | null> {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

interface PageProps { params: Promise<{ id: string }> }

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params
  const post = await fetchPost(id)
  if (!post) notFound()

  return (
    <div>
      <div className="mb-4 text-sm">
        <Link href="/admin" className="text-gray-500 hover:text-indigo-600">← All posts</Link>
      </div>
      <EditForm post={post} />
    </div>
  )
}
