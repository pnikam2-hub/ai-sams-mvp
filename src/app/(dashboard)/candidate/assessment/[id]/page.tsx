'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ClipboardList,
  Clock,
  BookOpen,
  AlertTriangle,
  ChevronLeft,
  Play,
  Loader2,
  Shield,
  Eye,
  HelpCircle,
  Timer,
  FileQuestion,
} from 'lucide-react';

interface AssessmentDetails {
  assessment: {
    id: string;
    title: string;
    description: string;
    duration_minutes: number;
    pass_percentage: number;
    scheduled_at: string | null;
    course: {
      title: string;
      nsqf_level: number;
    };
  };
  sections: {
    mcq: { count: number; total_marks: number };
    scenario: { count: number; total_marks: number };
    practical: { count: number; total_marks: number };
  };
  total_questions: number;
  total_marks: number;
}

export default function AssessmentLobbyPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  const [details, setDetails] = useState<AssessmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const res = await fetch(`/api/candidate/assessments/${assessmentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load assessment');
      }

      const data = await res.json();
      setDetails(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, router]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleStart = async () => {
    if (!agreed) {
      toast.error('Please agree to the rules before starting');
      return;
    }

    try {
      setStarting(true);
      const token = localStorage.getItem('access_token');

      const res = await fetch('/api/candidate/attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ assessment_id: assessmentId }),
      });

      if (res.status === 409) {
        const data = await res.json();
        toast.info('Assessment already completed');
        router.push(`/candidate/scorecard/${data.attempt.id}`);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to start assessment');
      }

      const data = await res.json();
      toast.success('Assessment started! Good luck!');

      // Navigate to MCQ section first
      router.push(`/candidate/assessment/${assessmentId}/mcq?attempt=${data.attempt.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start assessment');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Assessment not found</h2>
            <Button onClick={() => router.push('/candidate')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { assessment, sections, total_questions, total_marks } = details;

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
          <Badge variant="outline" className="text-xs">NSQF Level {assessment.course.nsqf_level}</Badge>
          <Badge variant="secondary" className="text-xs">{total_questions} Questions</Badge>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {assessment.title}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{assessment.course.title}</p>
      </div>

      {/* Assessment Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Duration</p>
              <p className="text-sm font-medium">{assessment.duration_minutes} minutes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Marks</p>
              <p className="text-sm font-medium">{total_marks}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pass Marks</p>
              <p className="text-sm font-medium">{assessment.pass_percentage}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sections Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-primary" />
            Assessment Sections
          </CardTitle>
          <CardDescription>
            Breakdown of question types and marks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sections.mcq.count > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Multiple Choice Questions</p>
                    <p className="text-xs text-slate-500">Select the best answer</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{sections.mcq.count} questions</p>
                  <p className="text-xs text-slate-500">{sections.mcq.total_marks} marks</p>
                </div>
              </div>
            )}

            {sections.scenario.count > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Scenario-Based Questions</p>
                    <p className="text-xs text-slate-500">Analyze and respond in detail</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{sections.scenario.count} questions</p>
                  <p className="text-xs text-slate-500">{sections.scenario.total_marks} marks</p>
                </div>
              </div>
            )}

            {sections.practical.count > 0 && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Practical Task</p>
                    <p className="text-xs text-slate-500">Upload your work</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{sections.practical.count} task{sections.practical.count !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-slate-500">{sections.practical.total_marks} marks</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rules and Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Rules & Instructions
          </CardTitle>
          <CardDescription>
            Please read carefully before starting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">1.</span>
              <span>You have <strong>{assessment.duration_minutes} minutes</strong> to complete all sections. The timer cannot be paused.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">2.</span>
              <span>Do not refresh the page or navigate away during the assessment. Your answers are auto-saved every 30 seconds.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">3.</span>
              <span>Each MCQ has only one correct answer. Select the best option.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">4.</span>
              <span>Scenario answers are evaluated based on relevance, depth, and application of concepts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">5.</span>
              <span>Practical submissions must be in PDF, ZIP, or image format (max 10MB each).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">6.</span>
              <span>You can flag questions for review and come back to them later.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">7.</span>
              <span>The assessment will auto-submit when time runs out.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">8.</span>
              <span>You need <strong>{assessment.pass_percentage}%</strong> overall to pass this assessment.</span>
            </li>
          </ul>
        </CardContent>
        <Separator />
        <CardFooter className="p-4 flex-col gap-4">
          <div className="flex items-start gap-3 w-full">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="agree" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
              I have read and understood all the rules. I agree to attempt this assessment fairly and will not use any unfair means.
            </label>
          </div>
          <Button
            size="lg"
            className="w-full"
            disabled={!agreed || starting}
            onClick={handleStart}
          >
            {starting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Assessment
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
