import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/batches/[id]/candidates - Add candidate to batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClientServer();
    const { id } = await params;
    const body = await request.json();
    const { candidate_id } = body;

    if (!candidate_id) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // Check if batch exists
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*, candidate_count:batch_candidates(count)')
      .eq('id', id)
      .single();

    if (batchError || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Check max candidates
    const currentCount = (batch.candidate_count as unknown as number) || 0;
    if (batch.max_candidates && currentCount >= batch.max_candidates) {
      return NextResponse.json(
        { error: 'Batch is full' },
        { status: 400 }
      );
    }

    // Check if candidate already enrolled
    const { data: existing } = await supabase
      .from('batch_candidates')
      .select('*')
      .eq('batch_id', id)
      .eq('candidate_id', candidate_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Candidate already enrolled in this batch' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('batch_candidates')
      .insert({
        batch_id: id,
        candidate_id,
        status: 'enrolled',
        enrollment_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    console.error('Batch candidates POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
