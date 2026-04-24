'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  title: string
  slug: string
  category: string | null
  published: boolean
  created_at: string
  updated_at: string | null
}

function fmtDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BulkSection({ title, posts, emptyMsg }: { title: string; posts: Post[]; emptyMsg: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const allIds = posts.map(p => p.id)
  const allSelected = selected.size === posts.length && posts.length > 0
  const someSelected = selected.size > 0

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function bulkAction(action: 'publish' | 'unpublish' | 'delete') {
    if (selected.size === 0) return
    if (action === 'delete' && !confirm(`Delete ${selected.size} article(s)? This cannot be undone.`)) return

    const res = await fetch('/api/admin/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), action }),
    })
    const data = await res.json()
    if (data.success) {
      setSelected(new Set())
      startTransition(() => router.refresh())
    } else {
      alert('Error: ' + (data.error || 'Unknown error'))
    }
  }

  async function quickPublish(id: string) {
    const res = await fetch('/api/admin/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], action: 'publish' }),
    })
    const data = await res.json()
    if (data.success) {
      startTransition(() => router.refresh())
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {title} ({posts.length})
        </h2>
        {someSelected && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{selected.size} selected</span>
            {title === 'Drafts' && (
              <button
                onClick={() => bulkAction('publish')}
                disabled={isPending}
                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded font-medium disabled:opacity-50"
              >
                ✅ Publish Selected
              </button>
            )}
            {title === 'Published' && (
              <button
                onClick={() => bulkAction('unpublish')}
                disabled={isPending}
                className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 text-white rounded font-medium disabled:opacity-50"
              >
                Unpublish Selected
              </button>
            )}
            <button
              onClick={() => bulkAction('delete')}
              disabled={isPending}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded font-medium disabled:opacity-50"
            >
              🗑 Delete Selected
            </button>
          </div>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-500 italic bg-white border border-gray-200 rounded p-4">{emptyMsg}</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left px-4 py-2">Title</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Created</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map(p => (
                <tr key={p.id} className={`border-t border-gray-100 hover:bg-gray-50 ${selected.has(p.id) ? 'bg-indigo-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/admin/${p.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                      {p.title}
                    </a>
                    <div className="text-xs text-gray-400 font-mono truncate max-w-xs">{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(p.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!p.published && (
                        <button
                          onClick={() => quickPublish(p.id)}
                          disabled={isPending}
                          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded font-medium disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}
                      <a
                        href={`https://blog.cottenfirm.com/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        View ↗
                      </a>
                      <a href={`/admin/${p.id}`} className="text-xs text-gray-700 hover:text-indigo-600">
                        Edit →
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {posts.length > 1 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              {title === 'Drafts' && (
                <button
                  onClick={() => { setSelected(new Set(allIds)); setTimeout(() => bulkAction('publish'), 50) }}
                  disabled={isPending}
                  className="text-xs text-green-700 hover:text-green-900 font-medium disabled:opacity-50"
                >
                  ✅ Publish all {posts.length} drafts
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
