import { getPostBySlug, getAllPosts } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post) return { title: 'Not Found' }

  return {
    title: post.title,
    description: post.meta_description || post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.meta_description || post.excerpt || undefined,
      type: 'article',
      authors: [post.author],
      publishedTime: post.published_at || post.created_at,
    },
  }
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) notFound()

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-400 mb-6">
        <Link href="/" className="hover:text-blue-600">Blog</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-600">{post.category || 'Article'}</span>
      </div>

      {/* Article header */}
      <header className="mb-8">
        {post.category && (
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            {post.category}
          </span>
        )}
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-4 leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{post.author}</span>
          <span>•</span>
          <span>{formatDate(post.published_at || post.created_at)}</span>
          {post.tags && post.tags.length > 0 && (
            <>
              <span>•</span>
              <div className="flex gap-2">
                {post.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Top CTA */}
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-slate-800 text-sm">Facing this charge in NC?</div>
          <div className="text-slate-600 text-xs mt-0.5">Sign up online — we appear in court for you.</div>
        </div>
        <a
          href="https://portal.cottenfirm.com"
          className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          Sign Up →
        </a>
      </div>

      {/* Article content */}
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Bottom CTA */}
      <div className="mt-12 p-6 bg-slate-900 rounded-2xl text-center">
        <h3 className="text-white text-xl font-bold mb-2">
          Charged with {post.category ? post.category.toLowerCase() : 'a traffic or criminal matter'} in NC?
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Cotten Firm serves Wake, Johnston, Harnett, Chatham & Orange counties.
          Sign up online in minutes — we handle the court appearance so you don't have to.
        </p>
        <a
          href="https://portal.cottenfirm.com"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Sign Up Now → Get Started
        </a>
        <div className="mt-3 text-slate-500 text-sm">
          Or call <a href="tel:+19195867072" className="text-slate-400 hover:text-white">(919) 586-7072</a>
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-slate-400 hover:text-blue-600">
          ← Back to all articles
        </Link>
      </div>
    </div>
  )
}
