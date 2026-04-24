import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isAuthenticatedRequest } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  if (!isAuthenticatedRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { ids, action } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    if (action === 'publish') {
      const { error } = await supabase
        .from('blog_posts')
        .update({ published: true, published_at: new Date().toISOString() })
        .in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, count: ids.length, action: 'published' })
    }

    if (action === 'unpublish') {
      const { error } = await supabase
        .from('blog_posts')
        .update({ published: false })
        .in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, count: ids.length, action: 'unpublished' })
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, count: ids.length, action: 'deleted' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
