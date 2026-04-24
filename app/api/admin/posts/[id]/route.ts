import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Allow only these fields to be updated
const ALLOWED_UPDATE_FIELDS = new Set([
  'title',
  'slug',
  'content',
  'excerpt',
  'meta_description',
  'category',
  'tags',
  'author',
  'featured_image',
  'published',
  'published_at',
])

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_UPDATE_FIELDS.has(k)) update[k] = v
  }

  // If publishing for the first time, stamp published_at
  if (body.published === true && !body.published_at) {
    update.published_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params
  const { error } = await supabaseAdmin
    .from('blog_posts')
    .delete()
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
