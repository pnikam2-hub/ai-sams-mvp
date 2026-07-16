import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/candidate/attempts/[id] - Get attempt with answers
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

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('candidate_attempts')
      .select(`
        *,
        assessment:assessments(
          id, title, description, duration_minutes, pass_percentage, scheduled_at,
          course:courses(id, title, nsqf_level)
        ),
        candidate:candidates(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Verify candidate ownership
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', userData.user.id)
      .single();

    if (candidate && attempt.candidate_id !== candidate.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all answers for this attempt
    const { data: answers, error: answersError } = await supabase
      .from('candidate_answers')
      .select(`
        *,
        question:questions(id, question_text, question_type, marks, options)
      `)
      .eq('attempt_id', id);

    if (answersError) {
      console.error('Answers fetch error:', answersError);
    }

    // Get practical submissions
    const { data: practicalSubmissions, error: psError } = await supabase
      .from('practical_submissions')
      .select(`
        *,
        question:questions(id, question_text, marks)
      `)
      .eq('attempt_id', id);

    if (psError) {
      console.error('Practical submissions error:', psError);
    }

    // Get assessment questions for navigation
    const { data: assessmentQuestions, error: aqError } = await supabase
      .from('assessment_questions')
      .select(`
        *,
        question:questions(
          id, question_text, question_type, options, marks, difficulty,
          practical_instructions, expected_deliverables, time_limit_minutes
        )
      `)
      .eq('assessment_id', attempt.assessment_id)
      .order('display_order', { ascending: true });

    if (aqError) {
      console.error('Assessment questions error:', aqError);
    }

    // Build answers map: question_id -> answer_text
    const answersMap: Record<string, string> = {};
    for (const answer of answers || []) {
      answersMap[answer.question_id] = answer.answer_text;
    }

    return NextResponse.json({
      attempt,
      answers: answersMap,
      answer_records: answers || [],
      practical_submissions: practicalSubmissions || [],
      questions: assessmentQuestions || [],
    });
  } catch (err) {
    console.error('Get attempt error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/candidate/attempts/[id] - Update an answer (autosave)
export async function PUT(
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
    const body = await request.json();
    const { question_id, answer_text, time_spent_seconds } = body;

    if (!question_id) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClientServer();

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify attempt exists and is in progress
    const { data: attempt, error: attemptError } = await supabase
      .from('candidate_attempts')
      .select('*, candidate:candidates(user_id)')
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Attempt is not in progress' },
        { status: 400 }
      );
    }

    // Upsert answer (insert or update)
    const { data: existingAnswer } = await supabase
      .from('candidate_answers')
      .select('id')
      .eq('attempt_id', id)
      .eq('question_id', question_id)
      .maybeSingle();

    let answerResult;
    if (existingAnswer) {
      const { data, error } = await supabase
        .from('candidate_answers')
        .update({
          answer_text: answer_text || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAnswer.id)
        .select()
        .single();
      answerResult = { data, error };
    } else {
      const { data, error } = await supabase
        .from('candidate_answers')
        .insert({
          attempt_id: id,
          question_id,
          answer_text: answer_text || '',
        })
        .select()
        .single();
      answerResult = { data, error };
    }

    if (answerResult.error) {
      console.error('Save answer error:', answerResult.error);
      return NextResponse.json(
        { error: 'Failed to save answer' },
        { status: 500 }
      );
    }

    // Update time spent
    if (time_spent_seconds !== undefined) {
      await supabase
        .from('candidate_attempts')
        .update({ time_spent_seconds })
        .eq('id', id);
    }

    return NextResponse.json({
      success: true,
      answer: answerResult.data,
      saved_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Update answer error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/candidate/attempts/[id] - Submit final attempt
export async function POST(
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
    const body = await request.json();
    const { time_spent_seconds } = body;

    const supabase = createClientServer();

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from('candidate_attempts')
      .select('*, assessment:assessments(duration_minutes)')
      .eq('id', id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Attempt is not in progress' },
        { status: 400 }
      );
    }

    // Update attempt to submitted
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('candidate_attempts')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        time_spent_seconds: time_spent_seconds || attempt.time_spent_seconds || 0,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Submit attempt error:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit attempt' },
        { status: 500 }
      );
    }

    // Trigger AI scoring for MCQ answers
    // This would typically be a background job
    try {
      const { data: mcqAnswers } = await supabase
        .from('candidate_answers')
        .select(`
          *,
          question:questions(id, correct_answer, marks)
        `)
        .eq('attempt_id', id);

      for (const answer of mcqAnswers || []) {
        if (answer.question?.correct_answer && answer.answer_text) {
          const isCorrect = answer.answer_text === answer.question.correct_answer;
          const marks = isCorrect ? answer.question.marks : 0;
          
          await supabase
            .from('candidate_answers')
            .update({
              marks_awarded: marks,
              scored_by: 'system',
              scored_at: new Date().toISOString(),
            })
            .eq('id', answer.id);
        }
      }

      // Update attempt status to scoring
      await supabase
        .from('candidate_attempts')
        .update({ status: 'scoring' })
        .eq('id', id);
    } catch (scoreErr) {
      console.error('Auto-scoring error:', scoreErr);
      // Don't fail the submission if scoring fails
    }

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt,
      message: 'Assessment submitted successfully',
    });
  } catch (err) {
    console.error('Submit attempt error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
