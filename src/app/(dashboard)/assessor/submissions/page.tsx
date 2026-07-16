'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ClipboardList,
  ArrowRight,
  Bot,
  Search,
  Filter,
  UserCheck,
  Clock,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Submission {
  id: string;
  candidate_name: string;
  candidate_email: string;
  batch_name: string;
  assessment_title: string;
  submitted_at: string;
  status: string;
  ai_suggestions_count: number;
  score_info: { approved: number; total: number };
  time_spent_seconds: number;
}

type StatusFilter = 'all' | 'submitted' | 'scoring' | 'reviewed' | 'finalized';

export default function SubmissionsListPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filtered, setFiltered] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const res = await fetch(`/api/assessor/submissions?${statusParam}`);
      if (!res.ok) throw new Error('Failed to load submissions');
      const data = await res.json();
      setSubmissions(data.data || []);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    let result = [...submissions];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.candidate_name.toLowerCase().includes(q) ||
          s.assessment_title.toLowerCase().includes(q) ||
          s.batch_name.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [submissions, searchQuery]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const columns: Column<Submission>[] = [
    {
      key: 'candidate_name',
      header: 'Candidate',
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-sm">{row.candidate_name}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-5">{row.candidate_email}</p>
        </div>
      ),
    },
    {
      key: 'assessment_title',
      header: 'Assessment',
      cell: (row) => (
        <div className="space-y-0.5">
          <span className="text-sm">{row.assessment_title}</span>
          <p className="text-xs text-muted-foreground">{row.batch_name}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <div className="space-y-1">
          <Badge
            variant={
              row.status === 'submitted'
                ? 'secondary'
                : row.status === 'scoring'
                ? 'default'
                : row.status === 'reviewed'
                ? 'outline'
                : 'default'
            }
            className={cn(
              'text-[10px] h-5',
              row.status === 'finalized' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
            )}
          >
            {row.status}
          </Badge>
          {row.score_info.total > 0 && (
            <div className="text-[10px] text-muted-foreground">
              {row.score_info.approved}/{row.score_info.total} scored
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'ai_status',
      header: 'AI Score',
      cell: (row) =>
        row.ai_suggestions_count > 0 ? (
          <div className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">{row.ai_suggestions_count} ready</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'submitted_at',
      header: 'Submitted',
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">
              {row.submitted_at
                ? new Date(row.submitted_at).toLocaleDateString()
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDuration(row.time_spent_seconds)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <Link href={`/assessor/review/${row.id}`}>
          <Button
            variant={row.status === 'finalized' ? 'ghost' : 'outline'}
            size="sm"
            className="h-7 gap-1 text-xs"
          >
            {row.status === 'finalized' ? 'View' : 'Review'}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        <p className="text-muted-foreground mt-1">
          Browse and review all candidate submissions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by candidate, assessment, or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="scoring">Scoring</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Submissions ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              keyExtractor={(row) => row.id}
              searchable={false}
              pageSize={10}
              emptyMessage="No submissions found matching your criteria"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
