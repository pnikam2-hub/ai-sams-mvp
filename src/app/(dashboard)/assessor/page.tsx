'use client';

import { useState, useEffect } from 'react';
import { KPICard } from '@/components/kpi-card';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList,
  CheckCircle,
  Users,
  Bot,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AssessorStats {
  pending_reviews: number;
  completed_today: number;
  total_candidates: number;
  ai_scored: number;
  manually_scored: number;
}

interface RecentSubmission {
  id: string;
  candidate_name: string;
  candidate_email: string;
  batch_name: string;
  assessment_title: string;
  submitted_at: string;
  status: string;
  ai_suggestions_count: number;
  score_info: { approved: number; total: number };
}

export default function AssessorDashboardPage() {
  const [stats, setStats] = useState<AssessorStats | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [statsRes, submissionsRes] = await Promise.all([
        fetch('/api/assessor/dashboard'),
        fetch('/api/assessor/submissions?status='),
      ]);

      if (!statsRes.ok) throw new Error('Failed to load stats');
      const statsData = await statsRes.json();
      if (statsData.data) setStats(statsData.data);

      if (submissionsRes.ok) {
        const subsData = await submissionsRes.json();
        setRecentSubmissions((subsData.data || []).slice(0, 5));
      }
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<RecentSubmission>[] = [
    {
      key: 'candidate_name',
      header: 'Candidate',
      cell: (row) => (
        <div>
          <span className="font-medium">{row.candidate_name}</span>
          <p className="text-xs text-muted-foreground">{row.candidate_email}</p>
        </div>
      ),
    },
    {
      key: 'assessment_title',
      header: 'Assessment',
      cell: (row) => (
        <div>
          <span className="text-sm">{row.assessment_title}</span>
          <p className="text-xs text-muted-foreground">{row.batch_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge
          variant={
            row.status === 'submitted'
              ? 'secondary'
              : row.status === 'scoring'
              ? 'default'
              : 'outline'
          }
          className="text-[10px] h-5"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'ai_status',
      header: 'AI Score',
      cell: (row) =>
        row.ai_suggestions_count > 0 ? (
          <div className="flex items-center gap-1">
            <Bot className="h-3 w-3 text-primary" />
            <span className="text-xs">{row.ai_suggestions_count} ready</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Pending</span>
        ),
    },
    {
      key: 'submitted_at',
      header: 'Submitted',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.submitted_at
            ? new Date(row.submitted_at).toLocaleDateString()
            : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Link href={`/assessor/review/${row.id}`}>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            Review
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const pendingCount = stats?.pending_reviews || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assessor Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Review and score candidate assessments
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Pending Reviews"
          value={stats?.pending_reviews ?? 0}
          icon={ClipboardList}
          description="Awaiting your evaluation"
          className={cn(pendingCount > 0 && 'border-amber-200 dark:border-amber-800')}
        />
        <KPICard
          title="Completed Today"
          value={stats?.completed_today ?? 0}
          icon={CheckCircle}
          description="Finalized assessments"
        />
        <KPICard
          title="Total Candidates"
          value={stats?.total_candidates ?? 0}
          icon={Users}
          description="With submitted assessments"
        />
        <KPICard
          title="AI Scored"
          value={stats?.ai_scored ?? 0}
          icon={Bot}
          description="AI-generated score suggestions"
        />
      </div>

      {/* Alert for pending reviews */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {pendingCount} assessment{pendingCount > 1 ? 's' : ''} pending review
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Candidates are waiting for their assessment results.
            </p>
          </div>
          <Link href="/assessor/submissions">
            <Button size="sm" variant="outline" className="bg-white dark:bg-transparent">
              View All
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Submissions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Submissions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Latest assessments awaiting review
              </p>
            </div>
            <Link href="/assessor/submissions">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={recentSubmissions}
              keyExtractor={(row) => row.id}
              searchable={false}
              pageSize={5}
              emptyMessage="No submissions awaiting review"
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">AI Suggestions</span>
              <span className="font-semibold">{stats?.ai_scored || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Manually Scored</span>
              <span className="font-semibold">{stats?.manually_scored || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending Reviews</span>
              <span className="font-semibold text-amber-600">{stats?.pending_reviews || 0}</span>
            </div>
            <div className="pt-2 space-y-2">
              <p className="text-sm font-medium">Quick Actions</p>
              <div className="flex flex-col gap-1">
                <Link href="/assessor/submissions">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    All Submissions
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
