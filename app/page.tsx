import { getAllPosts, type BlogPost } from '@/lib/supabase'
import Link from 'next/link'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export const revalidate = 3600 // Revalidate every hour

export default async function HomePage() {
  const posts = await getAllPosts() as Omit<BlogPost, 'content'>[]

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          NC Traffic & Criminal Defense Guide
        </h1>
        <p className="text-slate-600 text-lg">
          Practical legal guides for North Carolina drivers and residents facing traffic tickets,
          DWI charges, and criminal matters — from attorney Jeremy Cotten.
        </p>
        <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-slate-800">Charged with a traffic violation or criminal matter in NC?</div>
            <div className="text-slate-600 text-sm mt-0.5">Sign up online in minutes. We appear in court so you don't have to.</div>
          </div>
          <a
            href="https://portal.cottenfirm.com"
            className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Sign Up Now →
          </a>
        </div>
      </div>

      {/* Posts grid */}
      {posts.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg">Articles coming soon.</p>
          <p className="text-sm mt-2">Check back shortly for NC traffic and criminal defense guides.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => (
            <article key={post.id} className="border border-slate-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {post.category && (
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      {post.category}
                    </span>
                  )}
                  <h2 className="text-xl font-bold text-slate-900 mt-1 mb-2">
                    <Link href={`/${post.slug}`} className="hover:text-blue-600 transition-colors">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="text-slate-600 text-sm leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                </div>
              </div>
              <Link
                href={`/${post.slug}`}
                className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Read article →
              </Link>
            </article>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-12 p-6 bg-slate-900 rounded-2xl text-center">
        <h3 className="text-white text-xl font-bold mb-2">Need help with your case?</h3>
        <p className="text-slate-400 text-sm mb-4">
          Cotten Firm represents clients in Wake, Johnston, Harnett, Chatham & Orange counties.
          Sign up online — we handle the court appearance.
        </p>
        <a
          href="https://portal.cottenfirm.com"
          className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
        >
          Sign Up Now → Free Consultation
        </a>
        <div className="mt-3 text-slate-500 text-sm">Or call <a href="tel:+19195867072" className="text-slate-400 hover:text-white">(919) 586-7072</a></div>
      </div>
    </div>
  )
}
