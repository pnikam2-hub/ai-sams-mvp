import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/candidates - List candidates
export async function GET(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (err: unknown) {
    console.error('Candidates GET error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/admin/candidates - Register candidate
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientServer();
    const body = await request.json();

    const {
      full_name,
      email,
      phone,
      date_of_birth,
      gender,
      education,
      training_centre_id,
    } = body;

    if (!full_name) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('candidates')
      .insert({
        full_name,
        email,
        phone,
        date_of_birth,
        gender,
        education,
        training_centre_id: training_centre_id || null,
        status: 'registered',
        consent_given: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: unknown) {
    console.error('Candidates POST error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
