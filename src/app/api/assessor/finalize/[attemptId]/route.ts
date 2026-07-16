import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import type { FinalResult } from '@/types';

function calculateGrade(percentage: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (percentage >= 85) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

function calculateStatus(percentage: number, passPercentage: number): 'pass' | 'fail' {
  return percentage >= passPercentage ? 'pass' : 'fail';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await params;
    const body = await request.json();
    const { assessorId } = body as { assessorId: string };

    if (!assessorId) {
      return NextResponse.json(
        { error: 'Missing assessorId' },
        { status: 400 }
      );
    }

    const supabase = createClientServer();

    // Get the attempt with all related data
    const { data: attempt, error: attemptErr } = await supabase
      .from('candidate_attempts')
      .select(
        `
        *,
        candidate:candidates(id, full_name),
        assessment:assessments(id, title, pass_percentage)
      `
      )
      .eq('id', attemptId)
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Must be in 'reviewed' or 'scoring' status to finalize
    if (attempt.status === 'finalized') {
      return NextResponse.json(
        { error: 'Attempt is already finalized' },
        { status: 400 }
      );
    }

    // Get all approved assessor scores for this attempt
    const { data: scores, error: scoresErr } = await supabase
      .from('assessor_scores')
      .select(
        `
        *,
        answer:candidate_answers(question_id)
      `
      )
      .eq('attempt_id', attemptId)
      .eq('status', 'approved');

    if (scoresErr) throw scoresErr;

    if (!scores || scores.length === 0) {
      return NextResponse.json(
        { error: 'No approved scores found for this attempt' },
        { status: 400 }
      );
    }

    // Get questions to categorize scores by section
    const questionIds = scores
      .map((s) => (s.answer as { question_id?: string })?.question_id)
      .filter(Boolean) as string[];

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, question_type')
      .in('id', questionIds);

    if (qErr) throw qErr;

    const questionTypeMap = new Map(questions?.map((q) => [q.id, q.question_type]) || []);

    // Calculate section totals
    let mcqScore = 0;
    let mcqMax = 0;
    let scenarioScore = 0;
    let scenarioMax = 0;
    let practicalScore = 0;
    let practicalMax = 0;

    scores.forEach((score) => {
      const qId = (score.answer as { question_id?: string })?.question_id;
      const qType = questionTypeMap.get(qId || '') || 'mcq';

      switch (qType) {
        case 'mcq':
          mcqScore += score.final_score;
          mcqMax += score.max_score;
          break;
        case 'scenario':
          scenarioScore += score.final_score;
          scenarioMax += score.max_score;
          break;
        case 'practical':
          practicalScore += score.final_score;
          practicalMax += score.max_score;
          break;
      }
    });

    const totalScore = mcqScore + scenarioScore + practicalScore;
    const totalMax = mcqMax + scenarioMax + practicalMax;
    const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
    const passPercentage = (attempt.assessment as { pass_percentage?: number })?.pass_percentage || 70;
    const grade = calculateGrade(percentage);
    const status = calculateStatus(percentage, passPercentage);

    const now = new Date().toISOString();

    // Check if final result already exists
    const { data: existingResult } = await supabase
      .from('final_results')
      .select('id')
      .eq('attempt_id', attemptId)
      .single();

    let finalResult: FinalResult;

    if (existingResult) {
      // Update existing
      const { data: updated, error: updateErr } = await supabase
        .from('final_results')
        .update({
          mcq_score: mcqScore,
          mcq_max: mcqMax,
          scenario_score: scenarioScore,
          scenario_max: scenarioMax,
          practical_score: practicalScore,
          practical_max: practicalMax,
          total_score: totalScore,
          total_max: totalMax,
          percentage,
          grade,
          status,
          assessor_id: assessorId,
          finalized_at: now,
        })
        .eq('id', existingResult.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      finalResult = updated as FinalResult;
    } else {
      // Insert new final result
      const { data: inserted, error: insertErr } = await supabase
        .from('final_results')
        .insert({
          attempt_id: attemptId,
          candidate_id: attempt.candidate_id,
          assessment_id: attempt.assessment_id,
          mcq_score: mcqScore,
          mcq_max: mcqMax,
          scenario_score: scenarioScore,
          scenario_max: scenarioMax,
          practical_score: practicalScore,
          practical_max: practicalMax,
          total_score: totalScore,
          total_max: totalMax,
          percentage,
          grade,
          status,
          assessor_id: assessorId,
          finalized_at: now,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      finalResult = inserted as FinalResult;
    }

    // Update attempt status to 'finalized'
    await supabase
      .from('candidate_attempts')
      .update({ status: 'finalized' })
      .eq('id', attemptId);

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      table_name: 'final_results',
      record_id: finalResult.id,
      action: 'approve',
      new_values: {
        total_score: totalScore,
        total_max: totalMax,
        percentage,
        grade,
        status,
      } as unknown as Record<string, unknown>,
      performed_by: assessorId,
      performed_at: now,
    });

    return NextResponse.json({
      data: {
        final_result: finalResult,
        summary: {
          mcq_score: mcqScore,
          mcq_max: mcqMax,
          scenario_score: scenarioScore,
          scenario_max: scenarioMax,
          practical_score: practicalScore,
          practical_max: practicalMax,
          total_score: totalScore,
          total_max: totalMax,
          percentage,
          grade,
          status,
        },
      },
    });
  } catch (err: unknown) {
    console.error('Finalize error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
