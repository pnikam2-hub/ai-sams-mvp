'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AIScoreCard } from '@/components/assessor/ai-score-card';
import { ScoreEditor } from '@/components/assessor/score-editor';
import type { ScoreStatus } from '@/components/assessor/score-editor';
import {
  ArrowLeft,
  UserCheck,
  ClipboardCheck,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  Lock,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type {
  CandidateAttempt,
  CandidateAnswer,
  AIScoreSuggestion,
  AssessorScore,
  Question,
  Rubric,
} from '@/types';

interface EnrichedAnswer extends CandidateAnswer {
  ai_suggestion: AIScoreSuggestion | null;
  assessor_score: AssessorScore | null;
  question: Question;
}

interface SubmissionDetail {
  attempt: CandidateAttempt;
  batch_name: string;
  answers: EnrichedAnswer[];
  grouped_answers: {
    mcq: EnrichedAnswer[];
    scenario: EnrichedAnswer[];
    practical: EnrichedAnswer[];
  };
  total_questions: number;
  ai_suggested_count: number;
  scored_count: number;
  approved_count: number;
}

interface SectionSummary {
  score: number;
  max: number;
  approved: number;
  total: number;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAnswerId, setSavingAnswerId] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState<string | null>(null);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    total_score: number;
    total_max: number;
    percentage: number;
    grade: string;
    status: string;
  } | null>(null);

  const fetchSubmission = useCallback(async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/assessor/submissions/${attemptId}`);
      if (!res.ok) throw new Error('Failed to load submission');
      const data = await res.json();
      if (data.data) setSubmission(data.data);
    } catch {
      toast.error('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const handleGenerateAI = async (answer: EnrichedAnswer) => {
    if (!answer.question) return;
    setGeneratingAI(answer.id);
    try {
      const rubric = answer.question.rubric as Rubric | undefined;
      const res = await fetch('/api/ai-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerId: answer.id,
          questionText: answer.question.question_text,
          answerText: answer.answer_text,
          rubric: rubric || {
            title: 'Default Rubric',
            criteria: [{ criterion: 'Overall', max_score: answer.question.marks, description: 'Overall quality' }],
            max_total_score: answer.question.marks,
          },
          maxScore: answer.question.marks,
        }),
      });

      if (!res.ok) throw new Error('AI scoring failed');
      toast.success('AI score generated successfully');
      await fetchSubmission();
    } catch {
      toast.error('AI scoring failed. Please try again or score manually.');
    } finally {
      setGeneratingAI(null);
    }
  };

  const handleSaveScore = async (data: {
    answerId: string;
    attemptId: string;
    finalScore: number;
    maxScore: number;
    vivaRemarks: string;
    status: ScoreStatus;
  }) => {
    setSavingAnswerId(data.answerId);
    try {
      const aiSuggestion = submission?.answers.find(
        (a) => a.id === data.answerId
      )?.ai_suggestion;

      const res = await fetch('/api/assessor/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answerId: data.answerId,
          attemptId: data.attemptId,
          aiSuggestionId: aiSuggestion?.id,
          finalScore: data.finalScore,
          maxScore: data.maxScore,
          vivaRemarks: data.vivaRemarks,
          status: data.status,
          assessorId: 'current-user',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save score');
      }

      toast.success('Score saved successfully');
      await fetchSubmission();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save score';
      toast.error(message);
    } finally {
      setSavingAnswerId(null);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try {
      const res = await fetch(`/api/assessor/finalize/${attemptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessorId: 'current-user' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to finalize');
      }

      const data = await res.json();
      setResultSummary(data.data.summary);
      toast.success('Assessment finalized successfully');
      await fetchSubmission();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to finalize';
      toast.error(message);
    } finally {
      setFinalizing(false);
      setShowFinalizeDialog(false);
    }
  };

  // Calculate section summaries
  const getSectionSummary = (answers: EnrichedAnswer[]): SectionSummary => {
    let score = 0;
    let max = 0;
    let approved = 0;
    answers.forEach((a) => {
      max += a.question?.marks || 0;
      if (a.assessor_score?.status === 'approved') {
        score += a.assessor_score.final_score;
        approved++;
      }
    });
    return { score, max, approved, total: answers.length };
  };

  const mcqSummary = submission ? getSectionSummary(submission.grouped_answers.mcq) : null;
  const scenarioSummary = submission ? getSectionSummary(submission.grouped_answers.scenario) : null;
  const practicalSummary = submission ? getSectionSummary(submission.grouped_answers.practical) : null;

  const totalScore = (mcqSummary?.score || 0) + (scenarioSummary?.score || 0) + (practicalSummary?.score || 0);
  const totalMax = (mcqSummary?.max || 0) + (scenarioSummary?.max || 0) + (practicalSummary?.max || 0);
  const totalPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
  const totalApproved = (mcqSummary?.approved || 0) + (scenarioSummary?.approved || 0) + (practicalSummary?.approved || 0);
  const totalQuestions = (mcqSummary?.total || 0) + (scenarioSummary?.total || 0) + (practicalSummary?.total || 0);
  const allApproved = totalQuestions > 0 && totalApproved === totalQuestions;

  const isFinalized = submission?.attempt.status === 'finalized';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Submission Not Found</AlertTitle>
        <AlertDescription>
          The submission you are looking for does not exist or has been removed.
        </AlertDescription>
      </Alert>
    );
  }

  const candidateName = submission.attempt.candidate?.full_name || 'Unknown';
  const assessmentTitle = submission.attempt.assessment?.title || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/assessor/submissions">
            <Button variant="ghost" size="icon-sm" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Review Submission</h1>
            <p className="text-sm text-muted-foreground">
              {candidateName} — {assessmentTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFinalized && (
            <Badge
              variant="default"
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 gap-1"
            >
              <Lock className="h-3 w-3" />
              Finalized
            </Badge>
          )}
          <Badge variant={allApproved ? 'default' : 'secondary'} className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {totalApproved}/{totalQuestions} scored
          </Badge>
        </div>
      </div>

      {/* Candidate & Assessment Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Candidate</p>
              <p className="text-sm font-medium">{candidateName}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assessment</p>
              <p className="text-sm font-medium">{assessmentTitle}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm font-medium">
                {submission.attempt.submitted_at
                  ? new Date(submission.attempt.submitted_at).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Side by Side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT COLUMN - Submission Details */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Candidate Answers
          </h2>

          {/* MCQ Section */}
          {submission.grouped_answers.mcq.length > 0 && (
            <SectionCard
              title="MCQ Answers"
              icon={<FileText className="h-4 w-4" />}
              summary={mcqSummary}
            >
              {submission.grouped_answers.mcq.map((answer, idx) => (
                <AnswerDisplay
                  key={answer.id}
                  answer={answer}
                  index={idx}
                  isGeneratingAI={generatingAI === answer.id}
                  onGenerateAI={handleGenerateAI}
                />
              ))}
            </SectionCard>
          )}

          {/* Scenario Section */}
          {submission.grouped_answers.scenario.length > 0 && (
            <SectionCard
              title="Scenario Questions"
              icon={<FileText className="h-4 w-4" />}
              summary={scenarioSummary}
            >
              {submission.grouped_answers.scenario.map((answer, idx) => (
                <AnswerDisplay
                  key={answer.id}
                  answer={answer}
                  index={idx}
                  isGeneratingAI={generatingAI === answer.id}
                  onGenerateAI={handleGenerateAI}
                />
              ))}
            </SectionCard>
          )}

          {/* Practical Section */}
          {submission.grouped_answers.practical.length > 0 && (
            <SectionCard
              title="Practical Questions"
              icon={<FileText className="h-4 w-4" />}
              summary={practicalSummary}
            >
              {submission.grouped_answers.practical.map((answer, idx) => (
                <AnswerDisplay
                  key={answer.id}
                  answer={answer}
                  index={idx}
                  isGeneratingAI={generatingAI === answer.id}
                  onGenerateAI={handleGenerateAI}
                />
              ))}
            </SectionCard>
          )}
        </div>

        {/* RIGHT COLUMN - Scoring Interface */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Scoring Interface
          </h2>

          {submission.answers.map((answer) => (
            <ScoringCard
              key={answer.id}
              answer={answer}
              isSaving={savingAnswerId === answer.id}
              onSaveScore={handleSaveScore}
              onGenerateAI={handleGenerateAI}
              isGeneratingAI={generatingAI === answer.id}
            />
          ))}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="sticky bottom-0 z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-4 bg-background border-t">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total Score</p>
              <p className="text-xl font-bold tabular-nums">
                {totalScore} / {totalMax}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Percentage</p>
              <p
                className={cn(
                  'text-xl font-bold tabular-nums',
                  totalPercentage >= 70
                    ? 'text-emerald-600'
                    : totalPercentage >= 50
                    ? 'text-amber-600'
                    : 'text-red-600'
                )}
              >
                {totalPercentage}%
              </p>
            </div>
            {resultSummary && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Grade</p>
                  <p className="text-xl font-bold">{resultSummary.grade}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Result</p>
                  <Badge
                    variant={resultSummary.status === 'pass' ? 'default' : 'destructive'}
                    className="mt-1"
                  >
                    {resultSummary.status.toUpperCase()}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {!isFinalized && (
            <Button
              size="lg"
              onClick={() => setShowFinalizeDialog(true)}
              disabled={!allApproved || finalizing}
              className="min-w-40"
            >
              {finalizing ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-1.5" />
              )}
              Finalize Result
            </Button>
          )}
          {isFinalized && resultSummary && (
            <Badge
              variant="default"
              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 h-9 px-4 text-sm"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Finalized
            </Badge>
          )}
        </div>
      </div>

      {/* Finalize Dialog */}
      <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Assessment Result</DialogTitle>
            <DialogDescription>
              This will lock the scores and generate the final result. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex justify-between items-center rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Total Score</span>
              <span className="font-semibold">{totalScore} / {totalMax}</span>
            </div>
            <div className="flex justify-between items-center rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Percentage</span>
              <span className="font-semibold">{totalPercentage}%</span>
            </div>
            {mcqSummary && mcqSummary.total > 0 && (
              <div className="flex justify-between items-center rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">MCQ</span>
                <span className="text-sm">{mcqSummary.score} / {mcqSummary.max}</span>
              </div>
            )}
            {scenarioSummary && scenarioSummary.total > 0 && (
              <div className="flex justify-between items-center rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">Scenario</span>
                <span className="text-sm">{scenarioSummary.score} / {scenarioSummary.max}</span>
              </div>
            )}
            {practicalSummary && practicalSummary.total > 0 && (
              <div className="flex justify-between items-center rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">Practical</span>
                <span className="text-sm">{practicalSummary.score} / {practicalSummary.max}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirm Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-components

function SectionCard({
  title,
  icon,
  summary,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  summary: SectionSummary | null;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
          {summary && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {summary.approved}/{summary.total} scored
              </span>
              {summary.approved === summary.total && summary.total > 0 && (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </div>
          )}
        </div>
        {summary && summary.max > 0 && (
          <div className="text-xs text-muted-foreground">
            Score: {summary.score} / {summary.max}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function AnswerDisplay({
  answer,
  index,
  isGeneratingAI,
  onGenerateAI,
}: {
  answer: EnrichedAnswer;
  index: number;
  isGeneratingAI: boolean;
  onGenerateAI: (answer: EnrichedAnswer) => void;
}) {
  const question = answer.question as Question;
  const hasScore = answer.assessor_score?.status === 'approved';

  return (
    <div className={cn('rounded-lg border p-3', hasScore && 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Q{index + 1}. {question?.question_type?.toUpperCase()} ({question?.marks} marks)
          </p>
          <p className="text-sm font-medium mb-2">{question?.question_text}</p>
          <div className="rounded-md bg-muted p-2">
            <p className="text-xs text-muted-foreground mb-0.5">Candidate Answer:</p>
            <p className="text-sm">{answer.answer_text || 'No answer provided'}</p>
          </div>
        </div>
        {hasScore && (
          <Badge
            variant="default"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 shrink-0"
          >
            {answer.assessor_score?.final_score} / {question?.marks}
          </Badge>
        )}
      </div>
      {answer.ai_suggestion && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          AI Suggested: {answer.ai_suggestion.suggested_score} / {question?.marks}
        </div>
      )}
      {!answer.ai_suggestion && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 mt-2 text-xs gap-1"
          onClick={() => onGenerateAI(answer)}
          disabled={isGeneratingAI}
        >
          {isGeneratingAI ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {isGeneratingAI ? 'Generating...' : 'Generate AI Score'}
        </Button>
      )}
    </div>
  );
}

function ScoringCard({
  answer,
  isSaving,
  onSaveScore,
  onGenerateAI,
  isGeneratingAI,
}: {
  answer: EnrichedAnswer;
  isSaving: boolean;
  onSaveScore: (data: {
    answerId: string;
    attemptId: string;
    finalScore: number;
    maxScore: number;
    vivaRemarks: string;
    status: ScoreStatus;
  }) => void;
  onGenerateAI: (answer: EnrichedAnswer) => void;
  isGeneratingAI: boolean;
}) {
  const question = answer.question as Question;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="truncate">
            {question?.question_text?.substring(0, 80)}
            {question?.question_text?.length > 80 ? '...' : ''}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {question?.marks} marks
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Score Card */}
        <AIScoreCard
          aiSuggestion={answer.ai_suggestion}
          maxScore={question?.marks || 0}
          onRegenerate={() => onGenerateAI(answer)}
          isLoading={isGeneratingAI}
        />

        <Separator />

        {/* Score Editor */}
        <ScoreEditor
          answerId={answer.id}
          attemptId={answer.attempt_id}
          aiSuggestedScore={answer.ai_suggestion?.suggested_score}
          maxScore={question?.marks || 0}
          existingScore={answer.assessor_score}
          onSave={onSaveScore}
          isSaving={isSaving}
        />
      </CardContent>
    </Card>
  );
}
