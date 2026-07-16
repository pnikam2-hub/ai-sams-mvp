import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/assessments - List assessments
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const batchId = searchParams.get('batch_id');

    let query = supabase
      .from('assessments')
      .select(
        '*, batch:batches(name, course:courses(title)), course:courses(title), question_count:assessment_questions(count)'
      )
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (batchId) query = query.eq('batch_id', batchId);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error('Assessments GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/admin/assessments - Create assessment
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const body = await request.json();

    const {
      title,
      batch_id,
      course_id,
      description,
      duration_minutes,
      pass_percentage,
      scheduled_at,
    } = body;

    if (!title || !batch_id || !course_id || !duration_minutes) {
      return NextResponse.json(
        { error: 'Title, batch, course, and duration are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        title,
        batch_id,
        course_id,
        description,
        duration_minutes: parseInt(duration_minutes),
        pass_percentage: parseInt(pass_percentage) || 50,
        scheduled_at: scheduled_at || null,
        status: 'draft',
        created_by: body.created_by || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    console.error('Assessments POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
