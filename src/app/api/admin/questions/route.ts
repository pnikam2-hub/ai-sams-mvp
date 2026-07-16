import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/questions - List questions (filterable by type, course)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const { searchParams } = new URL(request.url);
    const questionType = searchParams.get('question_type');
    const courseId = searchParams.get('course_id');
    const status = searchParams.get('status');
    const difficulty = searchParams.get('difficulty');

    let query = supabase
      .from('questions')
      .select('*, course:courses(*), competency:competencies(*), rubric:rubrics(*)')
      .order('created_at', { ascending: false });

    if (questionType) query = query.eq('question_type', questionType);
    if (courseId) query = query.eq('course_id', courseId);
    if (status) query = query.eq('status', status);
    if (difficulty) query = query.eq('difficulty', difficulty);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error('Questions GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/admin/questions - Create question (MCQ with options, scenario, practical)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const body = await request.json();

    const {
      course_id,
      competency_id,
      question_type,
      question_text,
      options,
      correct_answer,
      marks,
      rubric_id,
      difficulty,
      bloom_level,
      time_limit_minutes,
      practical_instructions,
      expected_deliverables,
    } = body;

    if (!course_id || !question_type || !question_text || !marks) {
      return NextResponse.json(
        { error: 'Course, question type, question text, and marks are required' },
        { status: 400 }
      );
    }

    // Validate MCQ options
    if (question_type === 'mcq') {
      if (!options || options.length < 2) {
        return NextResponse.json(
          { error: 'MCQ requires at least 2 options' },
          { status: 400 }
        );
      }
      const correctOptions = options.filter((o: { is_correct: boolean }) => o.is_correct);
      if (correctOptions.length === 0) {
        return NextResponse.json(
          { error: 'At least one option must be marked as correct' },
          { status: 400 }
        );
      }
    }

    const { data: question, error } = await supabase
      .from('questions')
      .insert({
        course_id,
        competency_id: competency_id || null,
        question_type,
        question_text,
        correct_answer,
        marks: parseInt(marks),
        rubric_id: rubric_id || null,
        difficulty: difficulty || 'medium',
        bloom_level: bloom_level || 'remember',
        time_limit_minutes,
        practical_instructions,
        expected_deliverables,
        status: 'active',
        created_by: body.created_by || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert MCQ options
    if (question_type === 'mcq' && options && options.length > 0) {
      const optionsToInsert = options.map((opt: { text: string; is_correct: boolean }) => ({
        question_id: question.id,
        text: opt.text,
        is_correct: opt.is_correct,
      }));

      const { error: optError } = await supabase
        .from('mcq_options')
        .insert(optionsToInsert);

      if (optError) throw optError;
    }

    return NextResponse.json({ data: question }, { status: 201 });
  } catch (err: unknown) {
    console.error('Questions POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
