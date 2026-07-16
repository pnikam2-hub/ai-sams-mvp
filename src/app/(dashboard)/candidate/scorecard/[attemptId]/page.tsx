'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Award,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Target,
  Clock,
  Calendar,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface FinalResult {
  id: string;
  attempt_id: string;
  mcq_score: number;
  mcq_max: number;
  scenario_score: number;
  scenario_max: number;
  practical_score: number;
  practical_max: number;
  total_score: number;
  total_max: number;
  percentage: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  status: 'pass' | 'fail' | 'pending';
  finalized_at: string | null;
}

interface ScorecardData {
  attempt: {
    id: string;
    assessment_id: string;
    started_at: string;
    submitted_at: string | null;
    status: string;
    time_spent_seconds: number;
    assessment: {
      title: string;
      duration_minutes: number;
      pass_percentage: number;
      course: {
        title: string;
        nsqf_level: number;
      };
    };
  };
  result: FinalResult | null;
  answers: Array<{
    id: string;
    question_id: string;
    question?: {
      question_text: string;
      question_type: string;
      options?: Array<{ id: string; text: string }>;
      marks: number;
      correct_answer?: string;
    };
    answer_text: string;
    marks_awarded: number | null;
    scored_by: string | null;
    scored_at: string | null;
    assessor_remarks: string | null;
  }>;
  practical_submissions: Array<{
    id: string;
    question_id: string;
    file_name: string;
    file_size: number;
    description?: string;
  }>;
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

function getGradeBg(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-emerald-100 dark:bg-emerald-900/30';
    case 'B': return 'bg-blue-100 dark:bg-blue-900/30';
    case 'C': return 'bg-amber-100 dark:bg-amber-900/30';
    case 'D': return 'bg-orange-100 dark:bg-orange-900/30';
    case 'F': return 'bg-red-100 dark:bg-red-900/30';
    default: return 'bg-slate-100';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pass':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    case 'fail':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Minus className="w-5 h-5 text-slate-400" />;
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function ScorecardPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [data, setData] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

  const fetchScorecard = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch attempt details
      const res = await fetch(`/api/candidate/attempts/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load scorecard');
      }

      const attemptData = await res.json();

      // Fetch final result if available
      let result = null;
      if (['submitted', 'scoring', 'reviewed', 'finalized'].includes(attemptData.attempt.status)) {
        const resultRes = await fetch(`/api/candidate/attempts/${attemptId}/result`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (resultRes?.ok) {
          result = await resultRes.json();
        }

        // If no result API, try to compute from answers
        if (!result) {
          const mcqAnswers = (attemptData.answer_records || []).filter(
            (a: { question?: { question_type: string } }) => a.question?.question_type === 'mcq'
          );
          const scenarioAnswers = (attemptData.answer_records || []).filter(
            (a: { question?: { question_type: string } }) => a.question?.question_type === 'scenario'
          );
          const practicalSubs = attemptData.practical_submissions || [];

          const mcqScore = mcqAnswers.reduce(
            (sum: number, a: { marks_awarded: number | null }) => sum + (a.marks_awarded || 0),
            0
          );
          const mcqMax = mcqAnswers.reduce(
            (sum: number, a: { question?: { marks: number } }) => sum + (a.question?.marks || 0),
            0
          );
          const scenarioScore = scenarioAnswers.reduce(
            (sum: number, a: { marks_awarded: number | null }) => sum + (a.marks_awarded || 0),
            0
          );
          const scenarioMax = scenarioAnswers.reduce(
            (sum: number, a: { question?: { marks: number } }) => sum + (a.question?.marks || 0),
            0
          );
          const practicalScore = practicalSubs.length > 0 ? 0 : 0; // Practical needs manual scoring
          const practicalMax = practicalSubs.length > 0
            ? practicalSubs.reduce(
                (sum: number, s: { question?: { marks: number } }) => sum + (s.question?.marks || 0),
                0
              )
            : 0;

          const totalScore = mcqScore + scenarioScore + practicalScore;
          const totalMax = mcqMax + scenarioMax + practicalMax;
          const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

          let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
          if (percentage >= 90) grade = 'A';
          else if (percentage >= 80) grade = 'B';
          else if (percentage >= 70) grade = 'C';
          else if (percentage >= 60) grade = 'D';

          const passPercentage = attemptData.attempt.assessment?.pass_percentage || 60;
          const status = percentage >= passPercentage ? 'pass' : 'fail';

          result = {
            mcq_score: mcqScore,
            mcq_max: mcqMax,
            scenario_score: scenarioScore,
            scenario_max: scenarioMax,
            practical_score: practicalScore,
            practical_max: practicalMax,
            total_score: totalScore,
            total_max: totalMax,
            percentage,
            grade,
            status,
          };
        }
      }

      setData({
        attempt: attemptData.attempt,
        result,
        answers: attemptData.answer_records || [],
        practical_submissions: attemptData.practical_submissions || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scorecard');
      toast.error('Failed to load scorecard');
    } finally {
      setLoading(false);
    }
  }, [attemptId, router, token]);

  useEffect(() => {
    fetchScorecard();
  }, [fetchScorecard]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Failed to load scorecard</h2>
            <p className="text-slate-500 mb-4">{error}</p>
            <Button onClick={() => router.push('/candidate')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { attempt, result } = data;
  const isPending = !result || attempt.status === 'submitted' || attempt.status === 'scoring';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/candidate')}
        className="text-slate-500"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </Button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">{attempt.assessment.course.title}</Badge>
          <Badge variant="secondary">NSQF Level {attempt.assessment.course.nsqf_level}</Badge>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {attempt.assessment.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Submitted on {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'N/A'}
        </p>
      </div>

      {isPending ? (
        /* Pending scoring state */
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold mb-2">Results Pending</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your assessment has been submitted and is currently being scored. 
              Scenario and practical sections require manual review. 
              Check back later for your final results.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                MCQ: Auto-scored
              </div>
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                Scenario: Under review
              </div>
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                Practical: Under review
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Score Overview Card */}
          <Card className={`${result.status === 'pass' ? 'border-emerald-200' : 'border-red-200'}`}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Grade circle */}
                <div className={`
                  w-28 h-28 rounded-full flex flex-col items-center justify-center
                  ${getGradeBg(result.grade)}
                `}>
                  <span className={`text-4xl font-bold ${getGradeColor(result.grade)}`}>
                    {result.grade}
                  </span>
                  <span className="text-xs text-slate-500 uppercase tracking-wide mt-1">
                    Grade
                  </span>
                </div>

                {/* Score details */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                    {getStatusIcon(result.status)}
                    <span className={`text-lg font-semibold ${result.status === 'pass' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                      {result.status === 'pass' ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {result.percentage}%
                  </p>
                  <p className="text-sm text-slate-500">
                    {result.total_score} out of {result.total_max} marks
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Pass mark: {attempt.assessment.pass_percentage}%
                  </p>
                </div>

                {/* Time taken */}
                <div className="text-center sm:text-right">
                  <div className="flex items-center gap-2 text-sm text-slate-500 justify-center sm:justify-end">
                    <Clock className="w-4 h-4" />
                    {formatDuration(attempt.time_spent_seconds || 0)}
                  </div>
                  <p className="text-xs text-slate-400">Time taken</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Section Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* MCQ */}
              {result.mcq_max > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Multiple Choice Questions</span>
                    <span className="text-slate-600">
                      {result.mcq_score}/{result.mcq_max} ({Math.round((result.mcq_score / result.mcq_max) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${result.mcq_max > 0 ? (result.mcq_score / result.mcq_max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Scenario */}
              {result.scenario_max > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Scenario-Based Questions</span>
                    <span className="text-slate-600">
                      {result.scenario_score}/{result.scenario_max} ({Math.round((result.scenario_score / result.scenario_max) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${result.scenario_max > 0 ? (result.scenario_score / result.scenario_max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Practical */}
              {result.practical_max > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Practical Tasks</span>
                    <span className="text-slate-600">
                      {result.practical_score}/{result.practical_max} ({Math.round((result.practical_score / result.practical_max) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all"
                      style={{ width: `${result.practical_max > 0 ? (result.practical_score / result.practical_max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Total */}
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span>{result.total_score}/{result.total_max} ({result.percentage}%)</span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      result.status === 'pass' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${result.total_max > 0 ? (result.total_score / result.total_max) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-question breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Question Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.answers.map((answer, index) => {
                const maxMarks = answer.question?.marks || 0;
                const scoredMarks = answer.marks_awarded ?? 0;
                const isCorrect = scoredMarks === maxMarks && maxMarks > 0;
                const isPartial = scoredMarks > 0 && scoredMarks < maxMarks;
                const isUnscored = answer.marks_awarded === null;

                return (
                  <div
                    key={answer.id}
                    className={`p-3 rounded-lg border ${
                      isCorrect
                        ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10'
                        : isPartial
                        ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-900/10'
                        : isUnscored
                        ? 'border-slate-200'
                        : 'border-red-200 bg-red-50/50 dark:bg-red-900/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-400">Q{index + 1}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {answer.question?.question_type}
                          </Badge>
                          {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                          {isPartial && <TrendingUp className="w-3.5 h-3.5 text-amber-500" />}
                          {!isCorrect && !isPartial && !isUnscored && (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                          {isUnscored && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
                        </div>
                        <p className="text-sm font-medium truncate">
                          {answer.question?.question_text}
                        </p>
                        {answer.answer_text && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            Your answer: {answer.answer_text}
                          </p>
                        )}
                        {answer.assessor_remarks && (
                          <p className="text-xs text-slate-500 mt-1">
                            Remarks: {answer.assessor_remarks}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold ${
                          isCorrect ? 'text-emerald-600' : isPartial ? 'text-amber-600' : isUnscored ? 'text-slate-400' : 'text-red-600'
                        }`}>
                          {isUnscored ? '-' : scoredMarks}/{maxMarks}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Practical submissions */}
              {data.practical_submissions.map((sub, index) => (
                <div
                  key={sub.id}
                  className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-900/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-400">P{index + 1}</span>
                        <Badge variant="outline" className="text-[10px]">practical</Badge>
                        <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                      </div>
                      <p className="text-sm font-medium">{sub.file_name}</p>
                      {sub.description && (
                        <p className="text-xs text-slate-500 mt-1">{sub.description}</p>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 flex-shrink-0">Pending review</p>
                  </div>
                </div>
              ))}

              {data.answers.length === 0 && data.practical_submissions.length === 0 && (
                <p className="text-center text-sm text-slate-500 py-4">
                  No answers recorded
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-center pb-8">
        <Button onClick={() => router.push('/candidate')} size="lg">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
