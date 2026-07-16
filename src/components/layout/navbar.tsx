'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase';
import { toast } from 'sonner';
import type { RoleName } from '@/types';

interface NavbarProps {
  user: {
    full_name?: string;
    email?: string;
    role?: { name: RoleName; description?: string };
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const supabase = createClientBrowser();
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Failed to logout');
    }
  };

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U';

  const roleLabel = user?.role?.name
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg hidden sm:inline">AI-SAMS</span>
          <span className="text-muted-foreground text-sm">| Pilot MVP</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
