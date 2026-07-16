'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  ClipboardList,
  FileCheck,
  ClipboardCheck,
  ScrollText,
  Menu,
  Shield,
  Inbox,
  PenTool,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { RoleName } from '@/types';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: RoleName[];
}

const navItems: NavItem[] = [
  // Super Admin
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['super_admin'] },
  { label: 'Training Centres', href: '/admin/centres', icon: Building2, roles: ['super_admin'] },
  { label: 'Courses', href: '/admin/courses', icon: GraduationCap, roles: ['super_admin'] },
  { label: 'Batches', href: '/admin/batches', icon: Users, roles: ['super_admin'] },
  { label: 'Candidates', href: '/admin/candidates', icon: UserCheck, roles: ['super_admin'] },
  { label: 'Competencies', href: '/admin/competencies', icon: BookOpen, roles: ['super_admin'] },
  { label: 'Question Bank', href: '/admin/questions', icon: ClipboardList, roles: ['super_admin'] },
  { label: 'Rubrics', href: '/admin/rubrics', icon: FileCheck, roles: ['super_admin'] },
  { label: 'Assessments', href: '/admin/assessments', icon: ClipboardCheck, roles: ['super_admin'] },
  { label: 'Audit Log', href: '/admin/audit', icon: ScrollText, roles: ['super_admin'] },
  // Assessor
  { label: 'Dashboard', href: '/assessor', icon: LayoutDashboard, roles: ['assessor'] },
  { label: 'Submissions', href: '/assessor/submissions', icon: Inbox, roles: ['assessor'] },
  { label: 'Review', href: '/assessor/submissions', icon: PenTool, roles: ['assessor'] },
];

interface SidebarProps {
  userRole?: RoleName;
}

const homeRoute: Record<RoleName, string> = {
  super_admin: '/admin',
  tc_admin: '/tc-admin',
  assessor: '/assessor',
  candidate: '/candidate',
};

export function Sidebar({ userRole = 'super_admin' }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));
  const homeHref = homeRoute[userRole] || '/admin';

  const NavContent = () => (
    <>
      <div className="flex h-16 items-center gap-2 px-4 border-b lg:h-[60px] lg:px-6">
        <Shield className="h-6 w-6 text-primary" />
        <Link href={homeHref} className="font-bold text-lg tracking-tight">
          AI-SAMS
        </Link>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-1 px-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-2 font-medium',
                    isActive && 'bg-secondary text-secondary-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </>
  );

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden flex items-center h-16 border-b px-4 bg-background">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <NavContent />
          </SheetContent>
        </Sheet>
        <Link href={homeHref} className="font-bold text-lg tracking-tight">
          AI-SAMS
        </Link>
      </div>

      {/* Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-background h-screen sticky top-0">
        <NavContent />
      </aside>
    </>
  );
}
