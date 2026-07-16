'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import type { RoleName } from '@/types';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: { name: RoleName; description?: string };
  role_id: string;
  training_centre_id?: string | null;
  status: string;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClientBrowser();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (pathname !== '/login') {
            router.push('/login');
          }
          setLoading(false);
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('*, role:roles(name, description)')
          .eq('id', session.user.id)
          .single();

        if (!userData) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.email?.split('@')[0] || 'User',
            role: { name: 'super_admin', description: 'Default role' },
            role_id: '',
            status: 'active',
          });
          setLoading(false);
          return;
        }

        setUser(userData as unknown as User);
      } catch {
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router, pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
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
