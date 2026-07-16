import { createClientServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';

interface AssessorDashboardStats {
  pending_reviews: number;
  completed_today: number;
  total_candidates: number;
  ai_scored: number;
  manually_scored: number;
}

export async function GET() {
  try {
    const supabase = createClientServer();

    // Pending reviews = attempts with status 'submitted' or 'scoring'
    const { count: pendingCount, error: pendingErr } = await supabase
      .from('candidate_attempts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'scoring']);
    if (pendingErr) throw pendingErr;

    // Completed today = finalized today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: completedTodayCount, error: completedErr } = await supabase
      .from('candidate_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'finalized')
      .gte('submitted_at', todayStart.toISOString());
    if (completedErr) throw completedErr;

    // Total candidates with submitted attempts
    const { count: totalCandidates, error: candErr } = await supabase
      .from('candidate_attempts')
      .select('*', { count: 'exact', head: true })
      .not('submitted_at', 'is', null);
    if (candErr) throw candErr;

    // AI scored count (answers with AI suggestions)
    const { count: aiScored, error: aiErr } = await supabase
      .from('ai_score_suggestions')
      .select('*', { count: 'exact', head: true });
    if (aiErr) throw aiErr;

    // Manually scored (answers with assessor scores)
    const { count: manuallyScored, error: manualErr } = await supabase
      .from('assessor_scores')
      .select('*', { count: 'exact', head: true });
    if (manualErr) throw manualErr;

    const stats: AssessorDashboardStats = {
      pending_reviews: pendingCount || 0,
      completed_today: completedTodayCount || 0,
      total_candidates: totalCandidates || 0,
      ai_scored: aiScored || 0,
      manually_scored: manuallyScored || 0,
    };

    return NextResponse.json({ data: stats });
  } catch (err: unknown) {
    console.error('Assessor dashboard error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
