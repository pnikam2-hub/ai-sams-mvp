import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const supabase = createClientServer();

    // Get attempt with candidate and assessment details
    const { data: attempt, error: attemptErr } = await supabase
      .from('candidate_attempts')
      .select(
        `
        *,
        candidate:candidates(id, full_name, email, phone, training_centre_id),
        assessment:assessments(id, title, description, duration_minutes, pass_percentage, batch_id)
      `
      )
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Get batch info
    const batchId = (attempt.assessment as { batch_id?: string })?.batch_id;
    let batchName = 'N/A';
    if (batchId) {
      const { data: batch } = await supabase
        .from('batches')
        .select('name')
        .eq('id', batchId)
        .single();
      if (batch) batchName = batch.name;
    }

    // Get all answers for this attempt with question details
    const { data: answers, error: answersErr } = await supabase
      .from('candidate_answers')
      .select(
        `
        *,
        question:questions(id, question_text, question_type, marks, rubric_id, rubric:rubrics(id, title, criteria, max_total_score))
      `
      )
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true });

    if (answersErr) throw answersErr;

    // Get AI suggestions for these answers
    const answerIds = answers?.map((a) => a.id) || [];
    const { data: aiSuggestions, error: aiErr } = await supabase
      .from('ai_score_suggestions')
      .select('*')
      .in('answer_id', answerIds)
      .order('created_at', { ascending: false });

    if (aiErr) throw aiErr;

    // Get assessor scores for these answers
    const { data: assessorScores, error: scoresErr } = await supabase
      .from('assessor_scores')
      .select('*')
      .in('answer_id', answerIds);

    if (scoresErr) throw scoresErr;

    // Build enriched answer list
    const enrichedAnswers = (answers || []).map((answer) => {
      const aiSug = aiSuggestions?.find((s) => s.answer_id === answer.id) || null;
      const score = assessorScores?.find((s) => s.answer_id === answer.id) || null;

      return {
        ...answer,
        ai_suggestion: aiSug,
        assessor_score: score,
      };
    });

    // Group answers by question type
    const groupedAnswers = {
      mcq: enrichedAnswers.filter(
        (a) => (a.question as { question_type?: string })?.question_type === 'mcq'
      ),
      scenario: enrichedAnswers.filter(
        (a) => (a.question as { question_type?: string })?.question_type === 'scenario'
      ),
      practical: enrichedAnswers.filter(
        (a) => (a.question as { question_type?: string })?.question_type === 'practical'
      ),
    };

    const result = {
      attempt,
      batch_name: batchName,
      answers: enrichedAnswers,
      grouped_answers: groupedAnswers,
      total_questions: enrichedAnswers.length,
      ai_suggested_count: aiSuggestions?.length || 0,
      scored_count: assessorScores?.length || 0,
      approved_count:
        assessorScores?.filter((s) => s.status === 'approved').length || 0,
    };

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    console.error('Submission detail error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
