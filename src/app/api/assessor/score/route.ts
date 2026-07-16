import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface ScoreRequest {
  answerId: string;
  attemptId: string;
  aiSuggestionId?: string;
  finalScore: number;
  maxScore: number;
  vivaRemarks?: string;
  status: 'draft' | 'approved' | 'rejected' | 'reassess';
  assessorId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScoreRequest;

    // Validate required fields
    if (!body.answerId || !body.attemptId || body.finalScore === undefined || !body.assessorId) {
      return NextResponse.json(
        { error: 'Missing required fields: answerId, attemptId, finalScore, assessorId' },
        { status: 400 }
      );
    }

    // Validate score range
    if (body.finalScore < 0 || body.finalScore > body.maxScore) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${body.maxScore}` },
        { status: 400 }
      );
    }

    const supabase = createClientServer();

    // Check if an assessor score already exists for this answer
    const { data: existingScore } = await supabase
      .from('assessor_scores')
      .select('*')
      .eq('answer_id', body.answerId)
      .single();

    let result;
    const now = new Date().toISOString();

    if (existingScore) {
      // Update existing score - log old values for audit
      const { data: updated, error: updateError } = await supabase
        .from('assessor_scores')
        .update({
          final_score: body.finalScore,
          max_score: body.maxScore,
          viva_remarks: body.vivaRemarks || null,
          status: body.status,
          ai_suggestion_id: body.aiSuggestionId || existingScore.ai_suggestion_id,
          assessor_id: body.assessorId,
          assessed_at: now,
        })
        .eq('id', existingScore.id)
        .select()
        .single();

      if (updateError) throw updateError;
      result = updated;

      // Audit log the update
      await supabase.from('audit_logs').insert({
        table_name: 'assessor_scores',
        record_id: existingScore.id,
        action: 'score',
        old_values: {
          final_score: existingScore.final_score,
          status: existingScore.status,
        } as unknown as Record<string, unknown>,
        new_values: {
          final_score: body.finalScore,
          status: body.status,
        } as unknown as Record<string, unknown>,
        performed_by: body.assessorId,
        performed_at: now,
      });
    } else {
      // Insert new score
      const { data: inserted, error: insertError } = await supabase
        .from('assessor_scores')
        .insert({
          attempt_id: body.attemptId,
          answer_id: body.answerId,
          ai_suggestion_id: body.aiSuggestionId || null,
          assessor_id: body.assessorId,
          final_score: body.finalScore,
          max_score: body.maxScore,
          viva_remarks: body.vivaRemarks || null,
          status: body.status,
          assessed_at: now,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      result = inserted;

      // Audit log the create
      await supabase.from('audit_logs').insert({
        table_name: 'assessor_scores',
        record_id: inserted.id,
        action: 'create',
        new_values: {
          answer_id: body.answerId,
          final_score: body.finalScore,
          status: body.status,
        } as unknown as Record<string, unknown>,
        performed_by: body.assessorId,
        performed_at: now,
      });
    }

    // Update candidate_answer with marks_awarded and remarks
    await supabase
      .from('candidate_answers')
      .update({
        marks_awarded: body.finalScore,
        scored_by: body.assessorId,
        scored_at: now,
        assessor_remarks: body.vivaRemarks || null,
      })
      .eq('id', body.answerId);

    // If all answers for this attempt are approved, update attempt status to 'reviewed'
    const { data: allAnswers } = await supabase
      .from('candidate_answers')
      .select('id')
      .eq('attempt_id', body.attemptId);

    const { data: allScores } = await supabase
      .from('assessor_scores')
      .select('answer_id, status')
      .eq('attempt_id', body.attemptId);

    const allAnswerIds = allAnswers?.map((a) => a.id) || [];
    const scoredAnswerIds =
      allScores?.filter((s) => s.status === 'approved').map((s) => s.answer_id) || [];

    if (
      allAnswerIds.length > 0 &&
      scoredAnswerIds.length === allAnswerIds.length
    ) {
      await supabase
        .from('candidate_attempts')
        .update({ status: 'reviewed' })
        .eq('id', body.attemptId);
    } else if (body.status === 'approved' || body.status === 'draft') {
      // Update attempt status to 'scoring' when at least one score is being entered
      await supabase
        .from('candidate_attempts')
        .update({ status: 'scoring' })
        .eq('id', body.attemptId);
    }

    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    console.error('Score POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
