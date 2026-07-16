import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/competencies - List competencies
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const { searchParams } = new URL(request.url);
    const nsqfLevel = searchParams.get('nsqf_level');
    const type = searchParams.get('type');

    let query = supabase
      .from('competencies')
      .select('*, nsqf_level:nsqf_levels(*)')
      .order('code');

    if (nsqfLevel) query = query.eq('nsqf_level_id', parseInt(nsqfLevel));
    if (type) query = query.eq('type', type);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error('Competencies GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/admin/competencies - Create competency
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const body = await request.json();

    const {
      nsqf_level_id,
      code,
      title,
      description,
      type,
      learning_outcomes,
      knowledge_elements,
      skill_elements,
    } = body;

    if (!nsqf_level_id || !code || !title) {
      return NextResponse.json(
        { error: 'NSQF level, code, and title are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('competencies')
      .insert({
        nsqf_level_id: parseInt(nsqf_level_id),
        code,
        title,
        description,
        type: type || 'core',
        learning_outcomes: learning_outcomes || [],
        knowledge_elements: knowledge_elements || [],
        skill_elements: skill_elements || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    console.error('Competencies POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
