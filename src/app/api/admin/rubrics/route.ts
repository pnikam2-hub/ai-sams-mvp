import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/rubrics - List rubrics
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();

    const { data, error } = await supabase
      .from('rubrics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error('Rubrics GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/admin/rubrics - Create rubric with dynamic criteria
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const body = await request.json();

    const { title, description, criteria } = body;

    if (!title || !criteria || criteria.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one criterion are required' },
        { status: 400 }
      );
    }

    // Validate criteria
    for (const c of criteria) {
      if (!c.criterion || !c.max_score) {
        return NextResponse.json(
          { error: 'Each criterion must have a name and max score' },
          { status: 400 }
        );
      }
    }

    const maxTotalScore = criteria.reduce(
      (sum: number, c: { max_score: number }) => sum + c.max_score,
      0
    );

    const { data, error } = await supabase
      .from('rubrics')
      .insert({
        title,
        description,
        criteria,
        max_total_score: maxTotalScore,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    console.error('Rubrics POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
