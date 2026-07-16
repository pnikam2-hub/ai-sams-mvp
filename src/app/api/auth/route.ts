import { createClientServer } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/auth - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createClientServer();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Get user details with role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, role:roles(name, description)')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Failed to fetch user details' },
        { status: 500 }
      );
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.user.id);

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: userData.full_name,
        role: userData.role,
        role_id: userData.role_id,
        training_centre_id: userData.training_centre_id,
        status: userData.status,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/auth - Get current user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabase = createClientServer();

    let userId: string | null = null;

    if (token) {
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (!error && userData.user) {
        userId = userData.user.id;
      }
    }

    if (!userId) {
      // Try session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        userId = sessionData.session.user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, role:roles(name, description)')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        role_id: userData.role_id,
        training_centre_id: userData.training_centre_id,
        status: userData.status,
        last_login: userData.last_login,
      },
    });
  } catch (err) {
    console.error('Get user error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/auth - Logout
export async function DELETE() {
  try {
    const supabase = createClientServer();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
