import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGatheringById } from '@/lib/actions/gatherings'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { gathering, error } = await getGatheringById(id)

    if (error || !gathering) {
      return NextResponse.json(
        { error: error || 'Збір не знайдено' },
        { status: 404 }
      )
    }

    return NextResponse.json({ gathering })
  } catch (error) {
    console.error('Get gathering error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необхідна авторизація' },
        { status: 401 }
      )
    }

    // Check if gathering exists and user is creator
    const { data: gathering, error: fetchError } = await supabase
      .from('gatherings')
      .select('creator_id')
      .eq('id', id)
      .single()

    if (fetchError || !gathering) {
      return NextResponse.json(
        { error: 'Збір не знайдено' },
        { status: 404 }
      )
    }

    if ((gathering as { creator_id: string }).creator_id !== user.id) {
      return NextResponse.json(
        { error: 'Ви не є творцем цього збору' },
        { status: 403 }
      )
    }

    // Delete gathering (slots and waitlist will be deleted by CASCADE)
    const { error: deleteError } = await supabase
      .from('gatherings')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete gathering error:', deleteError)
      return NextResponse.json(
        { error: 'Помилка видалення збору' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete gathering error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

