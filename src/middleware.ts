import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ROLE_ROUTES: Record<string, string[]> = {
  super_admin: ['/admin', '/api/admin'],
  tc_admin: ['/tc-admin', '/api/tc-admin'],
  assessor: ['/assessor', '/api/assessor'],
  candidate: ['/candidate', '/api/candidate'],
};

const PUBLIC_ROUTES = ['/login', '/register', '/disclaimer', '/api/auth', '/_next', '/favicon.ico'];

/**
 * Absolute origin for redirects.
 *
 * `request.url` is NOT usable here: behind a reverse proxy the Next server builds
 * it from its own bind host, so redirects leak `http://localhost:3100` to the
 * browser. Prefer the forwarded host, then NEXT_PUBLIC_APP_URL, then the request.
 */
function siteOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ??
    (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'https');

  if (host && !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(host)) {
    return `${proto}://${host}`;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;

  return `${proto}://${host ?? 'localhost:3000'}`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Check auth session
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    // Redirect unauthenticated users to login
    const loginUrl = new URL('/login', siteOrigin(request));
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get user with role
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*, role:roles(name)')
    .eq('id', session.user.id)
    .single();

  if (userError || !userData) {
    const loginUrl = new URL('/login', siteOrigin(request));
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (userData.role as { name: string })?.name || '';

  // Check role-based access
  const allowedRoutes = ROLE_ROUTES[userRole] || [];
  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!hasAccess) {
    // Redirect to role-appropriate dashboard
    const dashboardMap: Record<string, string> = {
      super_admin: '/admin',
      tc_admin: '/tc-admin',
      assessor: '/assessor',
      candidate: '/candidate',
    };
    const redirectUrl = dashboardMap[userRole] || '/login';
    return NextResponse.redirect(new URL(redirectUrl, siteOrigin(request)));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
