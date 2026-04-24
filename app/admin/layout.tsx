import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoutButton } from './LogoutButton'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-semibold text-gray-900">
            Cotten Firm Blog Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-gray-700 hover:text-indigo-600">All posts</Link>
            <Link href="/" className="text-gray-700 hover:text-indigo-600" target="_blank">View site →</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
