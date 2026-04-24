import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Arvow webhook — receives generated articles and saves to blog_posts
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret — check multiple header locations Arvow might use
    const expectedSecret = process.env.ARVOW_WEBHOOK_SECRET
    if (expectedSecret) {
      const headers = [
        request.headers.get('x-secret'),           // Arvow's actual header
        request.headers.get('x-arvow-secret'),
        request.headers.get('x-webhook-secret'),
        request.headers.get('authorization')?.replace('Bearer ', ''),
        request.nextUrl.searchParams.get('secret'),
      ]
      const isValid = headers.some(h => h === expectedSecret)
      if (!isValid) {
        // Log all headers for debugging
        const allHeaders: Record<string, string> = {}
        request.headers.forEach((v, k) => { allHeaders[k] = v })
        console.warn('Arvow webhook 401 — headers received:', JSON.stringify(allHeaders))
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    console.log('Arvow webhook received:', JSON.stringify(body).slice(0, 200))

    // Arvow sends article data — handle their payload format
    const article = body.article || body.data || body
    
    if (!article) {
      return NextResponse.json({ error: 'No article data' }, { status: 400 })
    }

    // Extract fields from Arvow's payload
    const title = article.title || article.h1 || 'Untitled'
    const content = article.content || article.html || article.body || ''
    const slug = article.slug || generateSlug(title)
    const excerpt = article.excerpt || article.summary || extractExcerpt(content)
    // Arvow doesn't reliably send meta_description — auto-derive from
    // excerpt (or content snippet) so every article ships with one.
    const metaDescription =
      article.meta_description ||
      article.metaDescription ||
      deriveMetaDescription(excerpt, content)
    const keyword = article.keyword || article.target_keyword || null
    const category = mapKeywordToCategory(keyword || title)

    // Save to Supabase blog_posts (as draft — not published yet)
    const { data, error } = await supabase
      .from('blog_posts')
      .upsert({
        slug,
        title,
        content,
        excerpt,
        meta_description: metaDescription,
        published: false, // Always draft first — Jeremy approves before publishing
        category,
        tags: keyword ? [keyword] : null,
        author: 'Jeremy Cotten, Attorney at Law',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' })
      .select('id, slug, title')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('Article saved as draft:', data?.slug)
    return NextResponse.json({ 
      success: true, 
      slug: data?.slug,
      message: 'Article saved as draft. Review at blog.cottenfirm.com/admin to publish.'
    })

  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — for Arvow to verify the webhook is live
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Cotten Firm Arvow webhook active',
    timestamp: new Date().toISOString()
  })
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function extractExcerpt(content: string): string {
  // Strip HTML tags and get first 200 chars
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.slice(0, 200) + (text.length > 200 ? '...' : '')
}

function deriveMetaDescription(excerpt: string, content: string): string | null {
  // Google truncates around 155-160 chars; aim for 155 with a clean word boundary.
  const TARGET = 155
  const source = (excerpt || content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim()
  if (!source) return null
  if (source.length <= TARGET) return source
  const truncated = source.slice(0, TARGET)
  const lastSpace = truncated.lastIndexOf(' ')
  const cut = lastSpace > TARGET - 30 ? truncated.slice(0, lastSpace) : truncated
  return cut.trim() + '…'
}

function mapKeywordToCategory(keyword: string): string {
  const k = keyword.toLowerCase()
  if (k.includes('dwi') || k.includes('dui') || k.includes('impaired')) return 'DWI'
  if (k.includes('speeding') || k.includes('speed')) return 'Speeding Tickets'
  if (k.includes('dwlr') || k.includes('license revoked')) return 'DWLR'
  if (k.includes('hit and run')) return 'Hit and Run'
  if (k.includes('traffic')) return 'Traffic Law'
  if (k.includes('criminal')) return 'Criminal Defense'
  return 'NC Traffic Law'
}
