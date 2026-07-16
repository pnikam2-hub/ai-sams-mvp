import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/candidate/attempts - Start a new attempt
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { assessment_id } = body;

    if (!assessment_id) {
      return NextResponse.json(
        { error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClientServer();

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userData.user.id;

    // Get candidate record
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const candidateId = candidate.id;

    // Check if there's already an in-progress attempt for this assessment
    const { data: existingAttempt, error: existingError } = await supabase
      .from('candidate_attempts')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('assessment_id', assessment_id)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (existingError) {
      console.error('Existing attempt check error:', existingError);
    }

    if (existingAttempt) {
      // Return existing attempt
      return NextResponse.json({ attempt: existingAttempt, isNew: false });
    }

    // Check if assessment is already completed
    const { data: completedAttempt } = await supabase
      .from('candidate_attempts')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('assessment_id', assessment_id)
      .in('status', ['submitted', 'scoring', 'reviewed', 'finalized'])
      .maybeSingle();

    if (completedAttempt) {
      return NextResponse.json(
        { error: 'Assessment already completed', attempt: completedAttempt },
        { status: 409 }
      );
    }

    // Get client IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    // Create new attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('candidate_attempts')
      .insert({
        assessment_id,
        candidate_id: candidateId,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        ip_address: ipAddress,
        time_spent_seconds: 0,
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Create attempt error:', attemptError);
      return NextResponse.json(
        { error: 'Failed to create attempt' },
        { status: 500 }
      );
    }

    return NextResponse.json({ attempt, isNew: true });
  } catch (err) {
    console.error('Start attempt error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
