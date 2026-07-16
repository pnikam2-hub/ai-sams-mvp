import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/candidate/attempts/[id]/result - Get final result for attempt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const supabase = createClientServer();

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get final result
    const { data: result, error: resultError } = await supabase
      .from('final_results')
      .select('*')
      .eq('attempt_id', id)
      .single();

    if (resultError) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Get result error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
