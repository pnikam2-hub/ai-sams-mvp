import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/courses - List courses with competencies
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const nsqfLevel = searchParams.get('nsqf_level');

    let query = supabase
      .from('courses')
      .select('*, competencies:course_competencies(*, competency:competencies(*, nsqf_level:nsqf_levels(*)))')
      .order('title');

    if (status) query = query.eq('status', status);
    if (nsqfLevel) query = query.eq('nsqf_level', parseInt(nsqfLevel));

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error('Courses GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/admin/courses - Create course with competency mapping
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const body = await request.json();

    const { title, description, nsqf_level, duration_hours, competency_ids } = body;

    if (!title || !nsqf_level) {
      return NextResponse.json(
        { error: 'Title and NSQF level are required' },
        { status: 400 }
      );
    }

    // Insert course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        nsqf_level: parseInt(nsqf_level),
        duration_hours,
        status: 'active',
      })
      .select()
      .single();

    if (courseError) throw courseError;

    // Map competencies if provided
    if (competency_ids && competency_ids.length > 0) {
      const mappings = competency_ids.map((cid: string) => ({
        course_id: course.id,
        competency_id: cid,
        weight_percentage: Math.floor(100 / competency_ids.length),
      }));

      const { error: mapError } = await supabase
        .from('course_competencies')
        .insert(mappings);

      if (mapError) throw mapError;
    }

    return NextResponse.json({ data: course }, { status: 201 });
  } catch (err: unknown) {
    console.error('Courses POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
