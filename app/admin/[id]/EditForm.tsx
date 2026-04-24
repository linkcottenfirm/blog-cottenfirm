'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminBlogPost } from '@/lib/supabase-admin'

const PUBLIC_BLOG_BASE_URL = 'https://blog.cottenfirm.com'
const META_DESCRIPTION_TARGET_LEN = 155

function deriveMetaDescription(excerpt: string, content: string): string {
  // Prefer the excerpt; fall back to the stripped first chunk of the content.
  const source = (excerpt || stripHtml(content)).trim()
  if (!source) return ''
  if (source.length <= META_DESCRIPTION_TARGET_LEN) return source
  const truncated = source.slice(0, META_DESCRIPTION_TARGET_LEN)
  // Try to back up to a word boundary so we don't cut mid-word
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > META_DESCRIPTION_TARGET_LEN - 30 ? truncated.slice(0, lastSpace) : truncated).trim() + '…'
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

type EditorView = 'edit' | 'preview' | 'split'

export function EditForm({ post }: { post: AdminBlogPost }) {
  const router = useRouter()
  const [title, setTitle] = useState(post.title)
  const [slug, setSlug] = useState(post.slug)
  const [excerpt, setExcerpt] = useState(post.excerpt || '')
  const [metaDescription, setMetaDescription] = useState(post.meta_description || '')
  const [category, setCategory] = useState(post.category || '')
  const [content, setContent] = useState(post.content)
  const [view, setView] = useState<EditorView>('edit')

  const [saving, startSaving] = useTransition()
  const [publishing, startPublishing] = useTransition()
  const [unpublishing, startUnpublishing] = useTransition()
  const [deleting, startDeleting] = useTransition()
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    setMessage(null)
    const res = await fetch(`/api/admin/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setMessage({ kind: 'error', text: body.error || `Save failed (${res.status})` })
      return false
    }
    return true
  }

  function save(extra: Record<string, unknown> = {}, successMsg = 'Saved'): void {
    const fn = extra.published === true ? startPublishing : extra.published === false ? startUnpublishing : startSaving
    fn(async () => {
      const ok = await patch({
        title,
        slug,
        excerpt,
        meta_description: metaDescription,
        category,
        content,
        ...extra,
      })
      if (ok) {
        setMessage({ kind: 'success', text: successMsg })
        router.refresh()
      }
    })
  }

  function deletePost(): void {
    if (!confirm(`Permanently delete "${post.title}"? This cannot be undone.`)) return
    startDeleting(async () => {
      const res = await fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        setMessage({ kind: 'error', text: 'Delete failed' })
      }
    })
  }

  function autofillMetaDescription(): void {
    const generated = deriveMetaDescription(excerpt, content)
    if (generated) setMetaDescription(generated)
  }

  const isPublished = post.published
  const publicUrl = `${PUBLIC_BLOG_BASE_URL}/${post.slug}`

  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Edit post</h1>
          <p className="text-xs text-gray-500 mt-1">
            Status: {isPublished ? <span className="text-green-700 font-medium">Published</span> : <span className="text-amber-700 font-medium">Draft</span>}
            {' · '}
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              View public URL ↗
            </a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => save({}, 'Saved')}
            disabled={saving}
            className="px-3 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          {!isPublished ? (
            <button
              type="button"
              onClick={() => save({ published: true }, 'Published')}
              disabled={publishing}
              className="px-3 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
            >
              {publishing ? 'Publishing…' : 'Save & publish'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save({ published: false }, 'Unpublished')}
              disabled={unpublishing}
              className="px-3 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50"
            >
              {unpublishing ? 'Unpublishing…' : 'Unpublish'}
            </button>
          )}
          <button
            type="button"
            onClick={deletePost}
            disabled={deleting}
            className="px-3 py-2 text-sm font-medium text-red-700 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-6 py-2 text-sm ${message.kind === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="p-6 space-y-4">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Slug" hint="URL path. Lowercase letters, numbers, hyphens only.">
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Category">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Meta description</label>
            <button
              type="button"
              onClick={autofillMetaDescription}
              className="text-xs text-indigo-600 hover:underline"
            >
              Generate from excerpt
            </button>
          </div>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Used in Google search results. ~155 chars max."
          />
          <div className="text-xs text-gray-400 mt-1">
            {metaDescription.length} chars
            {metaDescription.length > 160 && <span className="text-amber-600 ml-2">⚠ Google may truncate over ~160</span>}
          </div>
        </div>

        <Field label="Excerpt" hint="Short summary used in listings and social shares.">
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <div role="tablist" aria-label="Editor view" className="inline-flex border border-gray-300 rounded overflow-hidden text-xs">
              <ViewTab name="Edit" active={view === 'edit'} onClick={() => setView('edit')} />
              <ViewTab name="Preview" active={view === 'preview'} onClick={() => setView('preview')} />
              <ViewTab name="Split" active={view === 'split'} onClick={() => setView('split')} />
            </div>
          </div>

          {view === 'edit' && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={28}
              className="w-full border border-gray-300 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}

          {view === 'preview' && (
            <div className="border border-gray-300 rounded bg-white">
              <div
                className="p-6 prose prose-sm max-w-none overflow-auto"
                style={{ minHeight: '600px' }}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          )}

          {view === 'split' && (
            <div className="border border-gray-300 rounded bg-gray-50 grid grid-cols-1 md:grid-cols-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={28}
                className="bg-white border-r border-gray-300 px-3 py-2 text-xs font-mono focus:outline-none"
              />
              <div className="p-4 prose prose-sm max-w-none overflow-auto" dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400 border-t border-gray-100 pt-4">
          <div>ID: <code className="font-mono">{post.id}</code></div>
          <div>Created: {new Date(post.created_at).toLocaleString()}</div>
          {post.updated_at && <div>Updated: {new Date(post.updated_at).toLocaleString()}</div>}
          {post.published_at && <div>First published: {new Date(post.published_at).toLocaleString()}</div>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  )
}

function ViewTab({ name, active, onClick }: { name: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        'px-3 py-1.5 transition-colors ' +
        (active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50')
      }
    >
      {name}
    </button>
  )
}
