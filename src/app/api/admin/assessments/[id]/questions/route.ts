import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/assessments/[id]/questions - Add question to assessment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClientServer();
    const { id } = await params;
    const body = await request.json();
    const { question_id, display_order, section } = body;

    if (!question_id || !section) {
      return NextResponse.json(
        { error: 'Question ID and section are required' },
        { status: 400 }
      );
    }

    // Verify assessment exists
    const { data: assessment, error: assessErr } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .single();

    if (assessErr || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    // Check if already added
    const { data: existing } = await supabase
      .from('assessment_questions')
      .select('*')
      .eq('assessment_id', id)
      .eq('question_id', question_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Question already added to this assessment' },
        { status: 400 }
      );
    }

    // Get next display order if not provided
    let order = display_order;
    if (!order) {
      const { data: maxOrder } = await supabase
        .from('assessment_questions')
        .select('display_order')
        .eq('assessment_id', id)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();
      order = maxOrder ? maxOrder.display_order + 1 : 1;
    }

    const { data, error } = await supabase
      .from('assessment_questions')
      .insert({
        assessment_id: id,
        question_id,
        display_order: order,
        section,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    console.error('Assessment questions POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
