import { createClientServer } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { DashboardKPI } from '@/types';

export async function GET() {
  try {
    const supabase = createClientServer();

    const { count: candidateCount, error: cErr } = await supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true });
    if (cErr) throw cErr;

    const { count: batchCount, error: bErr } = await supabase
      .from('batches')
      .select('*', { count: 'exact', head: true });
    if (bErr) throw bErr;

    const { count: assessmentCount, error: aErr } = await supabase
      .from('assessments')
      .select('*', { count: 'exact', head: true });
    if (aErr) throw aErr;

    // Pending reviews = attempts with status 'submitted' or 'scoring'
    const { count: pendingCount, error: pErr } = await supabase
      .from('candidate_attempts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['submitted', 'scoring']);
    if (pErr) throw pErr;

    // Completed assessments
    const { count: completedCount, error: compErr } = await supabase
      .from('candidate_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'finalized');
    if (compErr) throw compErr;

    // Pass rate from final_results
    const { data: results, error: rErr } = await supabase
      .from('final_results')
      .select('status');
    if (rErr) throw rErr;

    const passCount = results?.filter((r) => r.status === 'pass').length || 0;
    const totalResults = results?.length || 0;
    const passRate = totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 0;

    const kpi: DashboardKPI = {
      total_candidates: candidateCount || 0,
      total_batches: batchCount || 0,
      total_assessments: assessmentCount || 0,
      pending_reviews: pendingCount || 0,
      completed_assessments: completedCount || 0,
      pass_rate: passRate,
    };

    return NextResponse.json({ data: kpi });
  } catch (err: unknown) {
    console.error('Dashboard KPI error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
