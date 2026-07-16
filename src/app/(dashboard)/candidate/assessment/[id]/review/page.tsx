'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Timer } from '@/components/assessment/timer';
import { useAutosave } from '@/hooks/use-autosave';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Eye,
  ClipboardList,
  Pencil,
  XCircle,
  FileText,
  Timer as TimerIcon,
} from 'lucide-react';

interface AssessmentQuestion {
  id: string;
  question_id: string;
  display_order: number;
  section: 'mcq' | 'scenario' | 'practical';
  question: {
    id: string;
    question_text: string;
    question_type: string;
    options?: Array<{
      id: string;
      text: string;
    }>;
    marks: number;
    difficulty: string;
    practical_instructions?: string;
    expected_deliverables?: string;
  };
}

interface AttemptData {
  attempt: {
    id: string;
    assessment_id: string;
    started_at: string;
    status: string;
    assessment?: {
      title: string;
      duration_minutes: number;
      pass_percentage: number;
    };
  };
  answers: Record<string, string>;
  practical_submissions: Array<{
    id: string;
    question_id: string;
    file_url: string;
    file_name: string;
    file_size: number;
    description?: string;
  }>;
  questions: AssessmentQuestion[];
}

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const attemptId = searchParams.get('attempt');

  const [data, setData] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

  const { saveNow } = useAutosave({
    storageKey: `review_${attemptId || ''}`,
    onSave: async () => true,
  });

  const fetchAttempt = useCallback(async () => {
    if (!attemptId) {
      router.push(`/candidate/assessment/${assessmentId}`);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/candidate/attempts/${attemptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load attempt');
      }

      const attemptData = await res.json();
      setData(attemptData);

      if (attemptData.attempt.assessment?.duration_minutes) {
        const startedAt = new Date(attemptData.attempt.started_at).getTime();
        const durationMs = attemptData.attempt.assessment.duration_minutes * 60 * 1000;
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
        setInitialSeconds(remaining);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load attempt');
    } finally {
      setLoading(false);
    }
  }, [attemptId, assessmentId, router, token]);

  useEffect(() => {
    fetchAttempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeUp = useCallback(async () => {
    toast.warning('Time is up! Auto-submitting your assessment...');
    await handleFinalSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, token]);

  const handleFinalSubmit = async (isAutoSubmit = false) => {
    if (!attemptId) return;

    if (!isAutoSubmit && !agreed) {
      toast.error('Please confirm before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // First save all pending answers
      await saveNow();

      const res = await fetch(`/api/candidate/attempts/${attemptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ time_spent_seconds: timeSpent }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      // Clear timer from localStorage
      localStorage.removeItem(`assessment_timer_/candidate/assessment/${assessmentId}/mcq`);
      localStorage.removeItem(`autosave_mcq_${attemptId}`);
      localStorage.removeItem(`autosave_scenario_${attemptId}`);
      localStorage.removeItem(`autosave_practical_${attemptId}`);

      toast.success('Assessment submitted successfully!');
      router.push(`/candidate/scorecard/${attemptId}`);
    } catch {
      toast.error('Failed to submit assessment. Please try again.');
      setSubmitting(false);
    }
  };

  const getUnansweredCount = () => {
    if (!data) return 0;
    let count = 0;
    for (const q of data.questions) {
      if (q.section === 'mcq' || q.section === 'scenario') {
        if (!data.answers?.[q.question_id] || data.answers[q.question_id].trim() === '') {
          count++;
        }
      }
      if (q.section === 'practical') {
        const hasFile = data.practical_submissions?.some((s) => s.question_id === q.question_id);
        if (!hasFile) count++;
      }
    }
    return count;
  };

  const getOptionText = (question: AssessmentQuestion, answerId: string) => {
    const option = question.question.options?.find((o) => o.id === answerId);
    return option?.text || answerId;
  };

  const mcqQuestions = data?.questions?.filter((q) => q.section === 'mcq') || [];
  const scenarioQuestions = data?.questions?.filter((q) => q.section === 'scenario') || [];
  const practicalQuestions = data?.questions?.filter((q) => q.section === 'practical') || [];
  const unansweredCount = getUnansweredCount();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Review & Submit</span>
        </div>
        {initialSeconds > 0 && (
          <Timer
            initialSeconds={initialSeconds}
            onTimeUp={handleTimeUp}
            warningThreshold={300}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Submission Summary
              </CardTitle>
              <CardDescription>
                {data?.attempt?.assessment?.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {data?.questions?.length || 0}
                  </p>
                  <p className="text-xs text-slate-500">Total Questions</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {((data?.questions?.length || 0) - unansweredCount)}
                  </p>
                  <p className="text-xs text-emerald-600">Answered</p>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {unansweredCount}
                  </p>
                  <p className="text-xs text-amber-600">Unanswered</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {data?.attempt?.assessment?.pass_percentage}%
                  </p>
                  <p className="text-xs text-blue-600">Pass Mark</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    You have <strong>{unansweredCount} unanswered</strong> question{unansweredCount !== 1 ? 's' : ''}. 
                    You can go back and answer them, or submit as is.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MCQ Section */}
          {mcqQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  MCQ Answers ({mcqQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mcqQuestions.map((q, i) => {
                  const answer = data?.answers?.[q.question_id];
                  const isAnswered = answer && answer !== '';
                  return (
                    <div
                      key={q.question_id}
                      className={`p-3 rounded-lg border ${
                        isAnswered
                          ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10'
                          : 'border-slate-200 bg-slate-50 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {i + 1}. {q.question.question_text}
                          </p>
                          {isAnswered ? (
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                              <CheckCircle className="w-3.5 h-3.5 inline mr-1" />
                              {getOptionText(q, answer)}
                            </p>
                          ) : (
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                              <XCircle className="w-3.5 h-3.5 inline mr-1" />
                              Not answered
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/candidate/assessment/${assessmentId}/mcq?attempt=${attemptId}&q=${q.question_id}`
                            )
                          }
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Scenario Section */}
          {scenarioQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  Scenario Answers ({scenarioQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scenarioQuestions.map((q, i) => {
                  const answer = data?.answers?.[q.question_id];
                  const isAnswered = answer && answer.trim().length > 0;
                  const wordCount = isAnswered ? answer.trim().split(/\s+/).filter(Boolean).length : 0;
                  return (
                    <div
                      key={q.question_id}
                      className={`p-3 rounded-lg border ${
                        isAnswered
                          ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10'
                          : 'border-slate-200 bg-slate-50 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {i + 1}. {q.question.question_text}
                          </p>
                          {isAnswered ? (
                            <div className="mt-2">
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                {answer}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                {wordCount} words
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                              <XCircle className="w-3.5 h-3.5 inline mr-1" />
                              Not answered
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/candidate/assessment/${assessmentId}/scenario?attempt=${attemptId}&q=${q.question_id}`
                            )
                          }
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Practical Section */}
          {practicalQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-orange-500" />
                  Practical Submissions ({practicalQuestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {practicalQuestions.map((q, i) => {
                  const submission = data?.practical_submissions?.find(
                    (s) => s.question_id === q.question_id
                  );
                  const hasFile = !!submission;
                  return (
                    <div
                      key={q.question_id}
                      className={`p-3 rounded-lg border ${
                        hasFile
                          ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10'
                          : 'border-slate-200 bg-slate-50 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {i + 1}. {q.question.question_text}
                          </p>
                          {hasFile ? (
                            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                              <FileText className="w-3.5 h-3.5 inline mr-1" />
                              {submission.file_name} ({(submission.file_size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          ) : (
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                              <XCircle className="w-3.5 h-3.5 inline mr-1" />
                              No file uploaded
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/candidate/assessment/${assessmentId}/practical?attempt=${attemptId}&q=${q.question_id}`
                            )
                          }
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-40 bg-white dark:bg-slate-900 border-t px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/candidate/assessment/${assessmentId}/practical?attempt=${attemptId}`)
            }
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            size="lg"
            variant="default"
            disabled={submitting}
            onClick={() => setShowConfirmDialog(true)}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Final Submit
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
                Confirm Submission
              </CardTitle>
              <CardDescription>
                This action cannot be undone. Please review your answers before submitting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">MCQ answered:</span>
                  <span className="font-medium">
                    {mcqQuestions.filter((q) => data?.answers?.[q.question_id]).length}/{mcqQuestions.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scenario answered:</span>
                  <span className="font-medium">
                    {scenarioQuestions.filter((q) => data?.answers?.[q.question_id]?.trim()).length}/{scenarioQuestions.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Practical submitted:</span>
                  <span className="font-medium">
                    {practicalQuestions.filter((q) =>
                      data?.practical_submissions?.some((s) => s.question_id === q.question_id)
                    ).length}/{practicalQuestions.length}
                  </span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-lg text-sm text-amber-800 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  {unansweredCount} question{unansweredCount !== 1 ? 's' : ''} still unanswered.
                </div>
              )}

              <div className="flex items-start gap-3">
                <Checkbox
                  id="final-agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="final-agree" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  I have reviewed all my answers and confirm that I want to submit this assessment.
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                disabled={!agreed || submitting}
                onClick={() => handleFinalSubmit(false)}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Yes, Submit
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
