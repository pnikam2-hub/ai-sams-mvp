import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const batchId = searchParams.get('batch');
    const search = searchParams.get('search');

    // Get attempts with candidate, assessment, and batch info
    let query = supabase
      .from('candidate_attempts')
      .select(
        `
        *,
        candidate:candidates(id, full_name, email, training_centre_id),
        assessment:assessments(id, title, duration_minutes, batch_id)
      `
      )
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: show submitted and scoring
      query = query.in('status', ['submitted', 'scoring']);
    }

    const { data: attempts, error: attemptsErr } = await query;
    if (attemptsErr) throw attemptsErr;

    if (!attempts || attempts.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get batch info for each attempt
    const batchIds = [...new Set(attempts.map((a) => a.assessment?.batch_id).filter(Boolean))];
    const { data: batches, error: batchesErr } = await supabase
      .from('batches')
      .select('id, name')
      .in('id', batchIds);
    if (batchesErr) throw batchesErr;

    const batchMap = new Map(batches?.map((b) => [b.id, b]) || []);

    // Get AI suggestion counts per attempt
    const attemptIds = attempts.map((a) => a.id);
    const { data: aiSuggestions, error: aiErr } = await supabase
      .from('ai_score_suggestions')
      .select('id, answer_id, status')
      .in(
        'answer_id',
        attemptIds.map((id) => id)
      );
    // Note: we need to get answers first to map correctly

    // Get answers for these attempts
    const { data: answers, error: answersErr } = await supabase
      .from('candidate_answers')
      .select('id, attempt_id')
      .in('attempt_id', attemptIds);
    if (answersErr) throw answersErr;

    // Map answer IDs to attempt IDs
    const answerToAttemptMap = new Map<string, string>();
    answers?.forEach((a) => {
      answerToAttemptMap.set(a.id, a.attempt_id);
    });

    // Get AI suggestions mapped to attempts
    const answerIds = answers?.map((a) => a.id) || [];
    const { data: aiSugs, error: aiSugsErr } = await supabase
      .from('ai_score_suggestions')
      .select('answer_id, status')
      .in('answer_id', answerIds);
    if (aiSugsErr) throw aiSugsErr;

    const aiCountByAttempt = new Map<string, number>();
    aiSugs?.forEach((sug) => {
      const attemptId = answerToAttemptMap.get(sug.answer_id);
      if (attemptId) {
        aiCountByAttempt.set(attemptId, (aiCountByAttempt.get(attemptId) || 0) + 1);
      }
    });

    // Get assessor scores to determine review status
    const { data: assessorScores, error: scoresErr } = await supabase
      .from('assessor_scores')
      .select('answer_id, status')
      .in('answer_id', answerIds);
    if (scoresErr) throw scoresErr;

    const scoreCountByAttempt = new Map<string, { approved: number; total: number }>();
    assessorScores?.forEach((score) => {
      const attemptId = answerToAttemptMap.get(score.answer_id);
      if (attemptId) {
        const current = scoreCountByAttempt.get(attemptId) || { approved: 0, total: 0 };
        current.total += 1;
        if (score.status === 'approved') current.approved += 1;
        scoreCountByAttempt.set(attemptId, current);
      }
    });

    // Build enriched submissions
    const submissions = attempts.map((attempt) => {
      const batch = attempt.assessment?.batch_id
        ? batchMap.get(attempt.assessment.batch_id)
        : null;
      const aiCount = aiCountByAttempt.get(attempt.id) || 0;
      const scoreInfo = scoreCountByAttempt.get(attempt.id) || { approved: 0, total: 0 };

      return {
        id: attempt.id,
        candidate_name: (attempt.candidate as { full_name?: string })?.full_name || 'Unknown',
        candidate_email: (attempt.candidate as { email?: string })?.email || '',
        batch_name: batch?.name || 'N/A',
        assessment_title: (attempt.assessment as { title?: string })?.title || 'Unknown',
        submitted_at: attempt.submitted_at,
        status: attempt.status,
        ai_suggestions_count: aiCount,
        score_info: scoreInfo,
        time_spent_seconds: attempt.time_spent_seconds,
      };
    });

    // Filter by batch if specified
    let result = submissions;
    if (batchId) {
      result = result.filter((s) => {
        const attempt = attempts.find((a) => a.id === s.id);
        return attempt?.assessment?.batch_id === batchId;
      });
    }

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.candidate_name.toLowerCase().includes(q) ||
          s.assessment_title.toLowerCase().includes(q) ||
          s.batch_name.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    console.error('Submissions GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
