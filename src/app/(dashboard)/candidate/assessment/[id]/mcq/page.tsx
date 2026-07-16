'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Timer } from '@/components/assessment/timer';
import { QuestionNavigator } from '@/components/assessment/question-navigator';
import { useAutosave } from '@/hooks/use-autosave';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  XCircle,
  Loader2,
  AlertTriangle,
  Send,
  HelpCircle,
} from 'lucide-react';

interface AssessmentQuestion {
  id: string;
  question_id: string;
  display_order: number;
  section: string;
  question: {
    id: string;
    question_text: string;
    question_type: string;
    options: Array<{
      id: string;
      text: string;
      is_correct: boolean;
    }>;
    marks: number;
    difficulty: string;
  };
}

interface AttemptData {
  attempt: {
    id: string;
    assessment_id: string;
    started_at: string;
    status: string;
  };
  answers: Record<string, string>;
  questions: AssessmentQuestion[];
}

export default function McqSectionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const attemptId = searchParams.get('attempt');

  const [data, setData] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerStartRef = useRef(Date.now());

  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

  // Autosave hook
  const {
    status: saveStatus,
    setAnswer,
    saveNow,
  } = useAutosave({
    storageKey: `mcq_${attemptId || ''}`,
    onSave: async (answers) => {
      if (!attemptId) return false;
      try {
        const res = await fetch(`/api/candidate/attempts/${attemptId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question_id: Object.keys(answers).pop(),
            answer_text: Object.values(answers).pop(),
            time_spent_seconds: Math.floor((Date.now() - timerStartRef.current) / 1000),
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    },
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

      // Filter MCQ questions
      const mcqQuestions = (attemptData.questions || []).filter(
        (q: AssessmentQuestion) => q.section === 'mcq'
      );

      // Calculate remaining time
      if (attemptData.attempt.assessment?.duration_minutes) {
        const startedAt = new Date(attemptData.attempt.started_at).getTime();
        const durationMs = attemptData.attempt.assessment.duration_minutes * 60 * 1000;
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
        setInitialSeconds(remaining);
      }

      // Restore answers
      if (attemptData.answers) {
        const firstMcq = mcqQuestions[0];
        if (firstMcq && attemptData.answers[firstMcq.question_id]) {
          setSelectedOption(attemptData.answers[firstMcq.question_id]);
        }
      }

      // Check for recovery
      const saved = localStorage.getItem(`autosave_mcq_${attemptId}`);
      if (saved && attemptData.attempt.status === 'in_progress') {
        const parsed = JSON.parse(saved);
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          toast.info('Previous session data found. Answers loaded.', {
            duration: 5000,
          });
        }
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

  // Time tracking
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - timerStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mcqQuestions = (data?.questions || []).filter((q) => q.section === 'mcq');
  const currentQuestion = mcqQuestions[currentIndex];

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    if (currentQuestion) {
      setAnswer(currentQuestion.question_id, optionId);
    }
  };

  const handleClearSelection = () => {
    setSelectedOption('');
    if (currentQuestion) {
      setAnswer(currentQuestion.question_id, '');
    }
  };

  const handleFlagQuestion = () => {
    if (!currentQuestion) return;
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(currentQuestion.question_id)) {
      newFlagged.delete(currentQuestion.question_id);
      toast.info('Question unflagged');
    } else {
      newFlagged.add(currentQuestion.question_id);
      toast.info('Question flagged for review');
    }
    setFlaggedQuestions(newFlagged);
  };

  const handleNavigate = (index: number) => {
    if (index < 0 || index >= mcqQuestions.length) return;
    
    // Save current answer before navigating
    if (currentQuestion && selectedOption) {
      setAnswer(currentQuestion.question_id, selectedOption);
    }
    
    setCurrentIndex(index);
    const nextQuestion = mcqQuestions[index];
    if (nextQuestion && data?.answers) {
      setSelectedOption(data.answers[nextQuestion.question_id] || '');
    } else {
      setSelectedOption('');
    }
  };

  const handleTimeUp = useCallback(async () => {
    toast.warning('Time is up! Submitting your assessment...');
    await handleSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, token, timeSpent]);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!attemptId) return;

    // Save current answer first
    if (currentQuestion && selectedOption) {
      setAnswer(currentQuestion.question_id, selectedOption);
      await saveNow();
    }

    if (!isAutoSubmit) {
      const unanswered = mcqQuestions.filter(
        (q) => !data?.answers?.[q.question_id] && q.question_id !== currentQuestion?.question_id
      );
      if (selectedOption === '') unanswered.push(currentQuestion);
      
      if (unanswered.length > 0) {
        setShowSubmitConfirm(true);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/candidate/attempts/${attemptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ time_spent_seconds: timeSpent }),
      });

      if (!res.ok) throw new Error('Failed to submit');

      toast.success('Assessment submitted successfully!');
      router.push(`/candidate/scorecard/${attemptId}`);
    } catch {
      toast.error('Failed to submit assessment');
      setSubmitting(false);
    }
  };

  const getQuestionStatus = (questionId: string, index: number): 'answered' | 'unanswered' | 'flagged' | 'current' => {
    if (index === currentIndex) return 'current';
    if (flaggedQuestions.has(questionId)) return 'flagged';
    if (data?.answers?.[questionId] && data.answers[questionId] !== '') return 'answered';
    if (questionId === currentQuestion?.question_id && selectedOption) return 'answered';
    return 'unanswered';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No MCQ questions available</h2>
            <Button onClick={() => router.push(`/candidate/assessment/${assessmentId}/scenario?attempt=${attemptId}`)}>
              Continue to Scenario Section
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      {/* Left panel - Question Navigator */}
      <div className="hidden lg:block w-72 border-r bg-slate-50 dark:bg-slate-900/50">
        <QuestionNavigator
          questions={mcqQuestions.map((q, i) => ({
            id: q.question_id,
            index: i,
            status: getQuestionStatus(q.question_id, i),
            section: 'MCQ',
          }))}
          currentIndex={currentIndex}
          onQuestionClick={handleNavigate}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              MCQ Section
            </span>
            <span className="text-xs text-slate-500">
              Question {currentIndex + 1} of {mcqQuestions.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Autosave indicator */}
            <span className={`
              text-xs px-2 py-0.5 rounded-full transition-colors
              ${saveStatus === 'saving' ? 'bg-amber-50 text-amber-700' : ''}
              ${saveStatus === 'saved' ? 'bg-emerald-50 text-emerald-700' : ''}
              ${saveStatus === 'idle' ? 'bg-slate-50 text-slate-500' : ''}
              ${saveStatus === 'error' ? 'bg-red-50 text-red-700' : ''}
            `}>
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved'}
              {saveStatus === 'idle' && 'Auto-save on'}
              {saveStatus === 'error' && 'Save failed'}
            </span>

            {initialSeconds > 0 && (
              <Timer
                initialSeconds={initialSeconds}
                onTimeUp={handleTimeUp}
                warningThreshold={300}
              />
            )}
          </div>
        </div>

        {/* Question content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Question card */}
            <Card>
              <CardContent className="p-6 space-y-4">
                {/* Difficulty & Marks */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full font-medium
                      ${currentQuestion.question.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700' : ''}
                      ${currentQuestion.question.difficulty === 'medium' ? 'bg-amber-50 text-amber-700' : ''}
                      ${currentQuestion.question.difficulty === 'hard' ? 'bg-red-50 text-red-700' : ''}
                    `}>
                      {currentQuestion.question.difficulty}
                    </span>
                    <span className="text-xs text-slate-500">
                      {currentQuestion.question.marks} mark{currentQuestion.question.marks !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFlagQuestion}
                    className={flaggedQuestions.has(currentQuestion.question_id) ? 'text-amber-500' : 'text-slate-400'}
                  >
                    <Flag className="w-4 h-4 mr-1" />
                    {flaggedQuestions.has(currentQuestion.question_id) ? 'Flagged' : 'Flag for review'}
                  </Button>
                </div>

                {/* Question text */}
                <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  {currentQuestion.question.question_text}
                </div>

                <Separator />

                {/* Options */}
                <div className="space-y-2">
                  {currentQuestion.question.options?.map((option) => (
                    <label
                      key={option.id}
                      className={`
                        flex items-center gap-3 p-3 sm:p-4 rounded-lg border cursor-pointer transition-all
                        ${selectedOption === option.id
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
                        }
                      `}
                    >
                      <div className="relative flex items-center">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.question_id}`}
                          value={option.id}
                          checked={selectedOption === option.id}
                          onChange={() => handleOptionSelect(option.id)}
                          className="w-4 h-4 accent-primary"
                        />
                      </div>
                      <span className="text-sm flex-1">{option.text}</span>
                    </label>
                  ))}
                </div>

                {/* Clear selection */}
                {selectedOption && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Clear selection
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom navigation bar */}
        <div className="sticky bottom-0 z-40 bg-white dark:bg-slate-900 border-t px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => handleNavigate(currentIndex - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {/* Mobile question indicator */}
            <span className="lg:hidden text-xs text-slate-500">
              {currentIndex + 1} / {mcqQuestions.length}
            </span>

            <div className="flex items-center gap-2">
              {currentIndex < mcqQuestions.length - 1 ? (
                <Button size="sm" onClick={() => handleNavigate(currentIndex + 1)}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => router.push(`/candidate/assessment/${assessmentId}/scenario?attempt=${attemptId}`)}
                >
                  Go to Scenario
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-amber-600 mb-4">
                <AlertTriangle className="w-8 h-8" />
                <h3 className="text-lg font-semibold">Submit Section?</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                You have unanswered questions. Are you sure you want to proceed to the next section?
                You can still come back to review before final submission.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                  Keep Reviewing
                </Button>
                <Button
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    router.push(`/candidate/assessment/${assessmentId}/scenario?attempt=${attemptId}`);
                  }}
                >
                  Proceed
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
