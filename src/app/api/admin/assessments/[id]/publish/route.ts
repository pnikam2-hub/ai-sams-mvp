import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// PUT /api/admin/assessments/[id]/publish - Publish assessment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClientServer();
    const { id } = await params;
    const body = await request.json();
    const { scheduled_at } = body;

    // Verify assessment exists and has questions
    const { data: assessment, error: assessErr } = await supabase
      .from('assessments')
      .select('*, questions:assessment_questions(count)')
      .eq('id', id)
      .single();

    if (assessErr || !assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const questionCount = (assessment.questions as unknown as number) || 0;
    if (questionCount === 0) {
      return NextResponse.json(
        { error: 'Cannot publish assessment without questions' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('assessments')
      .update({
        status: scheduled_at ? 'scheduled' : 'active',
        scheduled_at: scheduled_at || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: unknown) {
    console.error('Assessment publish error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
