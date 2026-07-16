import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/batches - List batches with course, centre, candidate count
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const courseId = searchParams.get('course_id');

    let query = supabase
      .from('batches')
      .select(
        '*, course:courses(*), training_centre:training_centres(*), assessor:users(id, full_name), candidate_count:batch_candidates(count)'
      )
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (courseId) query = query.eq('course_id', courseId);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error('Batches GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/admin/batches - Create batch
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const body = await request.json();

    const {
      name,
      course_id,
      training_centre_id,
      assessor_id,
      start_date,
      end_date,
      assessment_date,
      max_candidates,
    } = body;

    if (!name || !course_id || !training_centre_id) {
      return NextResponse.json(
        { error: 'Name, course, and training centre are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('batches')
      .insert({
        name,
        course_id,
        training_centre_id,
        assessor_id: assessor_id || null,
        start_date,
        end_date,
        assessment_date,
        max_candidates: max_candidates || 30,
        status: 'upcoming',
        created_by: body.created_by || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    console.error('Batches POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
