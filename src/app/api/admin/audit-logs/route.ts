import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/audit-logs - List audit logs with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table_name');
    const action = searchParams.get('action');
    const performedBy = searchParams.get('performed_by');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    let query = supabase
      .from('audit_logs')
      .select('*, performed_by_user:users(id, full_name, email)')
      .order('performed_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (tableName) query = query.eq('table_name', tableName);
    if (action) query = query.eq('action', action);
    if (performedBy) query = query.eq('performed_by', performedBy);
    if (fromDate) query = query.gte('performed_at', fromDate);
    if (toDate) query = query.lte('performed_at', toDate + 'T23:59:59');

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error('Audit logs GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
