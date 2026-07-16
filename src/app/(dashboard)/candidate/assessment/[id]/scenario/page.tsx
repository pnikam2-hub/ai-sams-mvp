'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Timer } from '@/components/assessment/timer';
import { QuestionNavigator } from '@/components/assessment/question-navigator';
import { useAutosave } from '@/hooks/use-autosave';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  AlertTriangle,
  Send,
  Eye,
  Type,
  BarChart3,
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
    marks: number;
    difficulty: string;
    time_limit_minutes?: number;
  };
}

interface AttemptData {
  attempt: {
    id: string;
    assessment_id: string;
    started_at: string;
    status: string;
    assessment?: {
      duration_minutes: number;
    };
  };
  answers: Record<string, string>;
  questions: AssessmentQuestion[];
}

export default function ScenarioSectionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const attemptId = searchParams.get('attempt');

  const [data, setData] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerStartRef = useRef(Date.now());
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

  // Autosave hook
  const {
    status: saveStatus,
    setAnswer,
    saveNow,
  } = useAutosave({
    storageKey: `scenario_${attemptId || ''}`,
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

      // Calculate remaining time
      if (attemptData.attempt.assessment?.duration_minutes) {
        const startedAt = new Date(attemptData.attempt.started_at).getTime();
        const durationMs = attemptData.attempt.assessment.duration_minutes * 60 * 1000;
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
        setInitialSeconds(remaining);
      }

      // Restore scenario answers
      const scenarioQuestions = (attemptData.questions || []).filter(
        (q: AssessmentQuestion) => q.section === 'scenario'
      );
      const firstScenario = scenarioQuestions[0];
      if (firstScenario && attemptData.answers?.[firstScenario.question_id]) {
        const text = attemptData.answers[firstScenario.question_id];
        setAnswerText(text);
        setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
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

  const scenarioQuestions = (data?.questions || []).filter((q) => q.section === 'scenario');
  const currentQuestion = scenarioQuestions[currentIndex];

  const handleTextChange = (text: string) => {
    setAnswerText(text);
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    if (currentQuestion) {
      setAnswer(currentQuestion.question_id, text);
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
    if (index < 0 || index >= scenarioQuestions.length) return;

    // Save current answer before navigating
    if (currentQuestion) {
      setAnswer(currentQuestion.question_id, answerText);
    }

    setCurrentIndex(index);
    const nextQuestion = scenarioQuestions[index];
    if (nextQuestion && data?.answers) {
      const saved = data.answers[nextQuestion.question_id] || '';
      setAnswerText(saved);
      setWordCount(saved.trim().split(/\s+/).filter(Boolean).length);
    } else {
      setAnswerText('');
      setWordCount(0);
    }
  };

  const handleTimeUp = useCallback(async () => {
    toast.warning('Time is up! Submitting your assessment...');
    await handleSubmit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, token, timeSpent]);

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!attemptId) return;

    if (currentQuestion) {
      setAnswer(currentQuestion.question_id, answerText);
      await saveNow();
    }

    if (!isAutoSubmit) {
      const unanswered = scenarioQuestions.filter(
        (q) => !data?.answers?.[q.question_id] && q.question_id !== currentQuestion?.question_id
      );
      if (answerText.trim() === '') unanswered.push(currentQuestion);

      if (unanswered.length > 0) {
        setShowSubmitConfirm(true);
        return;
      }
    }

    router.push(`/candidate/assessment/${assessmentId}/practical?attempt=${attemptId}`);
  };

  const getQuestionStatus = (questionId: string, index: number): 'answered' | 'unanswered' | 'flagged' | 'current' => {
    if (index === currentIndex) return 'current';
    if (flaggedQuestions.has(questionId)) return 'flagged';
    if (data?.answers?.[questionId] && data.answers[questionId].trim().length > 0) return 'answered';
    if (questionId === currentQuestion?.question_id && answerText.trim().length > 0) return 'answered';
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
            <Eye className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No scenario questions available</h2>
            <Button onClick={() => router.push(`/candidate/assessment/${assessmentId}/practical?attempt=${attemptId}`)}>
              Continue to Practical Section
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
          questions={scenarioQuestions.map((q, i) => ({
            id: q.question_id,
            index: i,
            status: getQuestionStatus(q.question_id, i),
            section: 'Scenario',
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
            <Eye className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Scenario Section</span>
            <span className="text-xs text-slate-500">
              Question {currentIndex + 1} of {scenarioQuestions.length}
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
                      {currentQuestion.question.marks} marks
                    </span>
                    {currentQuestion.question.time_limit_minutes && (
                      <span className="text-xs text-slate-500">
                        {currentQuestion.question.time_limit_minutes} min limit
                      </span>
                    )}
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
                <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg">
                  {currentQuestion.question.question_text}
                </div>

                <Separator />

                {/* Answer textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Type className="w-4 h-4 text-slate-400" />
                      Your Answer
                    </label>
                    <span className={`text-xs ${wordCount < 20 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {wordCount} word{wordCount !== 1 ? 's' : ''}
                      {wordCount < 20 && ' (aim for at least 20 words)'}
                    </span>
                  </div>
                  <Textarea
                    value={answerText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Type your detailed response here... Explain your approach, reasoning, and any relevant concepts."
                    className="min-h-[250px] text-sm leading-relaxed resize-y"
                  />
                </div>

                {/* Writing tips */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                  <p className="font-medium">Writing tips:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Structure your answer with clear points</li>
                    <li>Include relevant examples or concepts</li>
                    <li>Address all aspects of the scenario</li>
                    <li>Be specific and avoid vague responses</li>
                  </ul>
                </div>
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

            <span className="lg:hidden text-xs text-slate-500">
              {currentIndex + 1} / {scenarioQuestions.length}
            </span>

            <div className="flex items-center gap-2">
              {currentIndex < scenarioQuestions.length - 1 ? (
                <Button size="sm" onClick={() => handleNavigate(currentIndex + 1)}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleSubmit(false)}
                >
                  Go to Practical
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
                <h3 className="text-lg font-semibold">Proceed to Practical?</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Some scenario questions are unanswered. You can still come back to review before final submission.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                  Keep Writing
                </Button>
                <Button
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    router.push(`/candidate/assessment/${assessmentId}/practical?attempt=${attemptId}`);
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
