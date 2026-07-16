'use client';

import { useState, useEffect } from 'react';
import { KPICard } from '@/components/kpi-card';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DashboardKPI } from '@/types';
import Link from 'next/link';

interface RecentActivity {
  id: string;
  action: string;
  table_name: string;
  performed_at: string;
  performed_by: string;
}

export default function AdminDashboardPage() {
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [kpiRes, activityRes] = await Promise.all([
        fetch('/api/admin/dashboard'),
        fetch('/api/admin/audit-logs?limit=10'),
      ]);

      if (!kpiRes.ok) throw new Error('Failed to load KPI data');
      const kpiData = await kpiRes.json();
      if (kpiData.data) setKpi(kpiData.data);

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.data || []);
      }
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<RecentActivity>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (row) => (
        <span className="capitalize font-medium">{row.action}</span>
      ),
    },
    {
      key: 'table_name',
      header: 'Table',
      cell: (row) => (
        <span className="text-muted-foreground">{row.table_name}</span>
      ),
    },
    {
      key: 'performed_by',
      header: 'By',
      cell: (row) => <span className="text-sm">{row.performed_by}</span>,
    },
    {
      key: 'performed_at',
      header: 'Date',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.performed_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your assessment management system
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Candidates"
          value={kpi?.total_candidates ?? 0}
          icon={Users}
          description="Registered candidates"
        />
        <KPICard
          title="Total Batches"
          value={kpi?.total_batches ?? 0}
          icon={GraduationCap}
          description="Active training batches"
        />
        <KPICard
          title="Total Assessments"
          value={kpi?.total_assessments ?? 0}
          icon={ClipboardCheck}
          description="Created assessments"
        />
        <KPICard
          title="Pending Reviews"
          value={kpi?.pending_reviews ?? 0}
          icon={AlertCircle}
          description="Awaiting evaluation"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Latest changes in the system
              </p>
            </div>
            <Link href="/admin/audit">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={recentActivity}
              keyExtractor={(row) => row.id}
              searchable={false}
              pageSize={5}
              emptyMessage="No recent activity"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pass Rate</span>
              <span className="font-semibold text-lg">{kpi?.pass_rate ?? 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completed</span>
              <span className="font-semibold text-lg">
                {kpi?.completed_assessments ?? 0}
              </span>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Quick Links</p>
              <div className="flex flex-col gap-1">
                <Link href="/admin/batches">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Manage Batches
                  </Button>
                </Link>
                <Link href="/admin/questions">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                    Question Bank
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
