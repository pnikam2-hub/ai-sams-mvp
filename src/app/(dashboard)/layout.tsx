import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import type { RoleName } from '@/types';

async function getUser() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Read-only in Server Component
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*, role:roles(name, description)')
    .eq('id', user.id)
    .single();

  if (!userData) {
    return null;
  }

  return {
    id: userData.id,
    email: userData.email,
    full_name: userData.full_name,
    role: userData.role as { name: RoleName; description?: string },
    role_id: userData.role_id,
    training_centre_id: userData.training_centre_id,
    status: userData.status,
  };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={user.role?.name || 'super_admin'} />
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar user={user} />
        <main className="flex-1 p-4 lg:p-6 bg-muted/20 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
