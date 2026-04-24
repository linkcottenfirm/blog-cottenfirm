import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const expectedSecret = process.env.ARVOW_WEBHOOK_SECRET
    if (expectedSecret) {
      const headers = [
        request.headers.get('x-secret'),
        request.headers.get('x-arvow-secret'),
        request.headers.get('x-webhook-secret'),
        request.headers.get('authorization')?.replace('Bearer ', ''),
        request.nextUrl.searchParams.get('secret'),
      ]
      const isValid = headers.some(h => h === expectedSecret)
      if (!isValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json()
    const article = body.article || body.data || body
    if (!article) {
      return NextResponse.json({ error: 'No article data' }, { status: 400 })
    }

    const title = article.title || article.h1 || 'Untitled'
    const content = article.content || article.html || article.body || ''
    const slug = article.slug || title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 80)
    const metaDescription = article.meta_description || article.metaDescription || null
    const excerpt = article.excerpt || article.summary || content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
    const keyword = article.keyword || article.target_keyword || null
    const k = (keyword || title).toLowerCase()
    const category = k.includes('dwi') || k.includes('dui') ? 'DWI' :
      k.includes('speeding') || k.includes('speed') ? 'Speeding Tickets' :
      k.includes('dwlr') ? 'DWLR' : k.includes('traffic') ? 'Traffic Law' : 'NC Traffic Law'

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('blog_posts')
      .upsert({
        slug, title, content, excerpt,
        meta_description: metaDescription,
        published: false,
        category,
        tags: keyword ? [keyword] : null,
        author: 'Jeremy Cotten, Attorney at Law',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'slug' })
      .select('id, slug, title')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, slug: data?.slug })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}
