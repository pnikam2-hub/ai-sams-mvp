'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  ClipboardList,
  Clock,
  Calendar,
  BookOpen,
  Award,
  AlertTriangle,
  ChevronRight,
  PlayCircle,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { type CandidateAttempt } from '@/types';

interface DashboardData {
  upcoming: Array<{
    id: string;
    title: string;
    course_name: string;
    scheduled_date: string;
    duration_minutes: number;
    status: string;
  }>;
  past: Array<{
    id: string;
    assessment_id: string;
    assessment_title: string;
    course_name: string;
    started_at: string;
    submitted_at: string | null;
    status: string;
    result: {
      total_score: number;
      total_max: number;
      percentage: number;
      grade: string;
      status: string;
    } | null;
  }>;
  in_progress: Array<{
    id: string;
    assessment_id: string;
    assessment: {
      id: string;
      title: string;
      duration_minutes: number;
    };
    started_at: string;
  }>;
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string }> = {
    upcoming: { variant: 'secondary', label: 'Upcoming', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400' },
    in_progress: { variant: 'default', label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400' },
    submitted: { variant: 'secondary', label: 'Submitted' },
    scoring: { variant: 'outline', label: 'Scoring', className: 'text-purple-600 border-purple-300 dark:text-purple-400' },
    reviewed: { variant: 'outline', label: 'Reviewed', className: 'text-emerald-600 border-emerald-300 dark:text-emerald-400' },
    finalized: { variant: 'outline', label: 'Completed', className: 'text-emerald-600 border-emerald-300 dark:text-emerald-400' },
    pass: { variant: 'default', label: 'Pass', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    fail: { variant: 'destructive', label: 'Fail' },
    pending: { variant: 'outline', label: 'Pending' },
  };

  const config = variants[status] || { variant: 'outline', label: status };
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-emerald-600';
    case 'B': return 'text-blue-600';
    case 'C': return 'text-amber-600';
    case 'D': return 'text-orange-600';
    case 'F': return 'text-red-600';
    default: return 'text-slate-600';
  }
}

export default function CandidateDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const res = await fetch('/api/candidate/dashboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load dashboard');
      }

      const dashboardData = await res.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleStartAssessment = (assessmentId: string) => {
    router.push(`/candidate/assessment/${assessmentId}`);
  };

  const handleResumeAssessment = (assessmentId: string, attemptId: string) => {
    router.push(`/candidate/assessment/${assessmentId}?attempt=${attemptId}`);
  };

  const handleViewScorecard = (attemptId: string) => {
    router.push(`/candidate/scorecard/${attemptId}`);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to load dashboard</h2>
            <p className="text-slate-500 mb-4">{error}</p>
            <Button onClick={fetchDashboard}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          My Assessments
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View your upcoming assessments and past results
        </p>
      </div>

      {/* In-progress assessments */}
      {data?.in_progress && data.in_progress.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <PlayCircle className="w-5 h-5" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.in_progress.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border"
                >
                  <div>
                    <p className="font-medium text-sm">{item.assessment.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Started {new Date(item.started_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleResumeAssessment(item.assessment_id, item.id)}
                  >
                    Resume
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Upcoming Assessments
          </CardTitle>
          <CardDescription>
            Assessments scheduled for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.upcoming && data.upcoming.length > 0 ? (
            <div className="space-y-3">
              {data.upcoming.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm">{assessment.title}</h3>
                      {getStatusBadge('upcoming')}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {assessment.course_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {assessment.duration_minutes} mins
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {assessment.scheduled_date
                          ? new Date(assessment.scheduled_date).toLocaleDateString()
                          : 'TBD'}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleStartAssessment(assessment.id)}
                  >
                    Start Assessment
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No upcoming assessments</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            Past Attempts
          </CardTitle>
          <CardDescription>
            Your completed assessment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.past && data.past.length > 0 ? (
            <div className="space-y-3">
              {data.past.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-sm">{attempt.assessment_title}</h3>
                      {getStatusBadge(attempt.status)}
                      {attempt.result && getStatusBadge(attempt.result.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {attempt.course_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {attempt.submitted_at
                          ? new Date(attempt.submitted_at).toLocaleDateString()
                          : new Date(attempt.started_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {attempt.result && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getGradeColor(attempt.result.grade)}`}>
                            {attempt.result.grade}
                          </p>
                          <p className="text-xs text-slate-500">
                            {attempt.result.percentage}%
                          </p>
                        </div>
                        <div className="text-right border-l pl-3">
                          <p className="text-sm font-medium">
                            {attempt.result.total_score}/{attempt.result.total_max}
                          </p>
                        </div>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewScorecard(attempt.id)}
                    >
                      <Award className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No past attempts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
