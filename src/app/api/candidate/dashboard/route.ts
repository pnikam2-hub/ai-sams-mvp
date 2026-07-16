import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/candidate/dashboard - Get upcoming and past assessments for logged-in candidate
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = createClientServer();

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userData.user.id;

    // Get candidate record for this user
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (candidateError || !candidate) {
      // Try to find by email as fallback
      const { data: candidateByEmail } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', userData.user.email)
        .single();
      
      if (!candidateByEmail) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
    }

    const candidateId = candidate?.id;

    // Get candidate's batch enrollments with assessment info
    const { data: batchCandidates, error: bcError } = await supabase
      .from('batch_candidates')
      .select(`
        id,
        batch_id,
        status,
        batch:batches(
          id,
          name,
          assessment_date,
          course_id,
          course:courses(id, title, nsqf_level, duration_hours)
        )
      `)
      .eq('candidate_id', candidateId);

    if (bcError) {
      console.error('Batch candidates error:', bcError);
      return NextResponse.json({ error: 'Failed to fetch batch data' }, { status: 500 });
    }

    // Get assessments linked to those batches
    const batchIds = batchCandidates?.map(bc => bc.batch_id) || [];
    
    const { data: assessments, error: assessmentError } = await supabase
      .from('assessments')
      .select(`
        *,
        course:courses(id, title, nsqf_level),
        batch:batches(id, name, assessment_date)
      `)
      .in('batch_id', batchIds.length > 0 ? batchIds : ['no-batches'])
      .order('scheduled_at', { ascending: true });

    if (assessmentError) {
      console.error('Assessments error:', assessmentError);
      return NextResponse.json({ error: 'Failed to fetch assessments' }, { status: 500 });
    }

    // Get candidate attempts for these assessments
    const assessmentIds = assessments?.map(a => a.id) || [];
    
    const { data: attempts, error: attemptsError } = await supabase
      .from('candidate_attempts')
      .select(`
        *,
        assessment:assessments(id, title, duration_minutes, pass_percentage)
      `)
      .eq('candidate_id', candidateId)
      .in('assessment_id', assessmentIds.length > 0 ? assessmentIds : ['no-assessments'])
      .order('created_at', { ascending: false });

    if (attemptsError) {
      console.error('Attempts error:', attemptsError);
    }

    // Get final results for completed attempts
    const attemptIds = attempts?.map(a => a.id) || [];
    
    const { data: results, error: resultsError } = await supabase
      .from('final_results')
      .select('*')
      .in('attempt_id', attemptIds.length > 0 ? attemptIds : ['no-attempts']);

    if (resultsError) {
      console.error('Results error:', resultsError);
    }

    // Categorize assessments
    const now = new Date().toISOString();
    const upcomingAssessments = [];
    const pastAttempts = [];

    for (const assessment of assessments || []) {
      const attempt = attempts?.find(a => a.assessment_id === assessment.id);
      const result = results?.find(r => r.attempt_id === attempt?.id);
      
      const scheduledAt = assessment.scheduled_at;
      const isUpcoming = scheduledAt && scheduledAt > now && !attempt;
      
      if (isUpcoming) {
        upcomingAssessments.push({
          ...assessment,
          course_name: assessment.course?.title || 'Unknown Course',
          scheduled_date: scheduledAt,
          duration_minutes: assessment.duration_minutes,
          status: 'upcoming',
        });
      } else if (attempt) {
        pastAttempts.push({
          ...attempt,
          assessment_title: assessment.title,
          course_name: assessment.course?.title || 'Unknown Course',
          scheduled_date: scheduledAt,
          result: result || null,
        });
      }
    }

    // Also include in-progress attempts
    const inProgressAttempts = attempts?.filter(a => a.status === 'in_progress') || [];

    return NextResponse.json({
      upcoming: upcomingAssessments,
      past: pastAttempts,
      in_progress: inProgressAttempts,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
