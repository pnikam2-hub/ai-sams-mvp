import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/candidate/assessments/[id] - Get assessment details with questions
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

    // Get assessment details
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select(`
        *,
        course:courses(id, title, nsqf_level, duration_hours),
        batch:batches(id, name, assessment_date)
      `)
      .eq('id', id)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    // Get assessment questions with question details
    const { data: assessmentQuestions, error: aqError } = await supabase
      .from('assessment_questions')
      .select(`
        *,
        question:questions(
          id,
          question_text,
          question_type,
          options,
          marks,
          difficulty,
          bloom_level,
          time_limit_minutes,
          practical_instructions,
          expected_deliverables
        )
      `)
      .eq('assessment_id', id)
      .order('display_order', { ascending: true });

    if (aqError) {
      console.error('Assessment questions error:', aqError);
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    // Group questions by section
    const mcqQuestions = assessmentQuestions?.filter(aq => aq.section === 'mcq') || [];
    const scenarioQuestions = assessmentQuestions?.filter(aq => aq.section === 'scenario') || [];
    const practicalQuestions = assessmentQuestions?.filter(aq => aq.section === 'practical') || [];

    // Calculate totals
    const totalMcqMarks = mcqQuestions.reduce((sum, aq) => sum + (aq.question?.marks || 0), 0);
    const totalScenarioMarks = scenarioQuestions.reduce((sum, aq) => sum + (aq.question?.marks || 0), 0);
    const totalPracticalMarks = practicalQuestions.reduce((sum, aq) => sum + (aq.question?.marks || 0), 0);

    return NextResponse.json({
      assessment,
      sections: {
        mcq: {
          questions: mcqQuestions,
          total_marks: totalMcqMarks,
          count: mcqQuestions.length,
        },
        scenario: {
          questions: scenarioQuestions,
          total_marks: totalScenarioMarks,
          count: scenarioQuestions.length,
        },
        practical: {
          questions: practicalQuestions,
          total_marks: totalPracticalMarks,
          count: practicalQuestions.length,
        },
      },
      total_questions: assessmentQuestions?.length || 0,
      total_marks: totalMcqMarks + totalScenarioMarks + totalPracticalMarks,
    });
  } catch (err) {
    console.error('Assessment details error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
