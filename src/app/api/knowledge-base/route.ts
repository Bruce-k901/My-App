import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// Use service role for knowledge base modifications (RLS restricts to service_role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to get authenticated user and check admin status
async function getAuthenticatedAdmin(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  // Check if user is Owner or Admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role')
    .eq('id', user.id)
    .single()

  if (!profile || !['Owner', 'Admin'].includes(profile.app_role)) {
    return { error: 'Forbidden - Admin access required', status: 403 }
  }

  return { user, profile }
}

// GET - List knowledge base entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabaseAdmin
      .from('knowledge_base')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      query = query.textSearch('search_vector', search, { type: 'websearch' })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching knowledge base:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Knowledge base GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create new knowledge base entry
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedAdmin(request)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const { title, content, summary, category, subcategory, tags, source } = body

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert({
        title,
        content,
        summary: summary || null,
        category,
        subcategory: subcategory || null,
        tags: tags || [],
        source: source || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating knowledge base entry:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Knowledge base POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
