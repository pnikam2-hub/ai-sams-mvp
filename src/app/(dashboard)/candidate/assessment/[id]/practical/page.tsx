'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Timer } from '@/components/assessment/timer';
import { FileUpload } from '@/components/assessment/file-upload';
import { useAutosave } from '@/hooks/use-autosave';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  AlertTriangle,
  Upload,
  CheckCircle,
  FileText,
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
    practical_instructions?: string;
    expected_deliverables?: string;
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

export default function PracticalSectionPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const attemptId = searchParams.get('attempt');

  const [data, setData] = useState<AttemptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [description, setDescription] = useState('');
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { file_name: string; file_size: number; file_url: string }>>({});
  const timerStartRef = useRef(Date.now());
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';

  const {
    status: saveStatus,
    setAnswer,
  } = useAutosave({
    storageKey: `practical_${attemptId || ''}`,
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

      // Map existing submissions
      const filesMap: Record<string, { file_name: string; file_size: number; file_url: string }> = {};
      for (const sub of attemptData.practical_submissions || []) {
        filesMap[sub.question_id] = {
          file_name: sub.file_name,
          file_size: sub.file_size,
          file_url: sub.file_url,
        };
      }
      setUploadedFiles(filesMap);

      // Restore description for current question
      const practicalQuestions = (attemptData.questions || []).filter(
        (q: AssessmentQuestion) => q.section === 'practical'
      );
      if (practicalQuestions[0] && filesMap[practicalQuestions[0].question_id]) {
        const sub = attemptData.practical_submissions?.find(
          (s: { question_id: string }) => s.question_id === practicalQuestions[0].question_id
        );
        if (sub?.description) setDescription(sub.description);
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

  const practicalQuestions = (data?.questions || []).filter((q) => q.section === 'practical');
  const currentQuestion = practicalQuestions[currentIndex];

  const handleUpload = async (file: File, desc?: string): Promise<boolean> => {
    if (!attemptId || !currentQuestion) return false;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('question_id', currentQuestion.question_id);
      if (desc || description) {
        formData.append('description', desc || description);
      }

      const res = await fetch(`/api/candidate/attempts/${attemptId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || 'Upload failed');
        return false;
      }

      const result = await res.json();
      
      setUploadedFiles(prev => ({
        ...prev,
        [currentQuestion.question_id]: {
          file_name: result.file_name,
          file_size: result.file_size,
          file_url: result.file_url,
        },
      }));

      // Also save description as answer
      if (desc || description) {
        setAnswer(currentQuestion.question_id, desc || description);
      }

      toast.success('File uploaded successfully!');
      return true;
    } catch {
      toast.error('Upload failed');
      return false;
    }
  };

  const handleNavigate = (index: number) => {
    if (index < 0 || index >= practicalQuestions.length) return;

    if (currentQuestion && description) {
      setAnswer(currentQuestion.question_id, description);
    }

    setCurrentIndex(index);
    const nextQuestion = practicalQuestions[index];
    if (nextQuestion) {
      const existing = uploadedFiles[nextQuestion.question_id];
      const existingSub = data?.practical_submissions?.find(s => s.question_id === nextQuestion.question_id);
      setDescription(existingSub?.description || '');
    }
  };

  const handleTimeUp = useCallback(async () => {
    toast.warning('Time is up! Submitting your assessment...');
    router.push(`/candidate/assessment/${assessmentId}/review?attempt=${attemptId}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, attemptId]);

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
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No practical tasks available</h2>
            <Button onClick={() => router.push(`/candidate/assessment/${assessmentId}/review?attempt=${attemptId}`)}>
              Go to Review
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentFile = uploadedFiles[currentQuestion.question_id];

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Practical Section</span>
          <span className="text-xs text-slate-500">
            Task {currentIndex + 1} of {practicalQuestions.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className={`
            text-xs px-2 py-0.5 rounded-full transition-colors
            ${saveStatus === 'saving' ? 'bg-amber-50 text-amber-700' : ''}
            ${saveStatus === 'saved' ? 'bg-emerald-50 text-emerald-700' : ''}
            ${saveStatus === 'idle' ? 'bg-slate-50 text-slate-500' : ''}
          `}>
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'idle' && 'Auto-save on'}
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

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Task {currentIndex + 1}: {currentQuestion.question.question_text}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <span className={`
                      inline-block text-xs px-2 py-0.5 rounded-full font-medium mr-2
                      ${currentQuestion.question.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700' : ''}
                      ${currentQuestion.question.difficulty === 'medium' ? 'bg-amber-50 text-amber-700' : ''}
                      ${currentQuestion.question.difficulty === 'hard' ? 'bg-red-50 text-red-700' : ''}
                    `}>
                      {currentQuestion.question.difficulty}
                    </span>
                    {currentQuestion.question.marks} marks
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentQuestion.question.practical_instructions && (
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-400 mb-2 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Instructions
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 whitespace-pre-line">
                    {currentQuestion.question.practical_instructions}
                  </p>
                </div>
              )}

              {currentQuestion.question.expected_deliverables && (
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Expected Deliverables
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">
                    {currentQuestion.question.expected_deliverables}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                Upload Your Work
              </CardTitle>
              <CardDescription>
                Submit your completed work as a PDF, ZIP file, or image (max 10MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onUpload={handleUpload}
                existingFile={currentFile || null}
              />

              <Separator />

              {/* Description textarea */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Description / Notes (optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any notes about your submission, links, or additional context..."
                  className="min-h-[100px] text-sm resize-y"
                />
              </div>

              {/* File list summary */}
              {currentFile && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                      File submitted: {currentFile.file_name}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {(currentFile.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation between practical questions */}
          {practicalQuestions.length > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => handleNavigate(currentIndex - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Task
              </Button>
              <span className="text-xs text-slate-500">
                Task {currentIndex + 1} of {practicalQuestions.length}
              </span>
              <Button
                size="sm"
                disabled={currentIndex === practicalQuestions.length - 1}
                onClick={() => handleNavigate(currentIndex + 1)}
              >
                Next Task
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-40 bg-white dark:bg-slate-900 border-t px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/candidate/assessment/${assessmentId}/scenario?attempt=${attemptId}`)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Scenario
          </Button>

          <Button
            size="lg"
            onClick={() => router.push(`/candidate/assessment/${assessmentId}/review?attempt=${attemptId}`)}
          >
            Review & Submit
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
