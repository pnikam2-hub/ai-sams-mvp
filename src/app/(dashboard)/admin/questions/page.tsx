'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Trash2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import type { Question, Course, Competency, Rubric } from '@/types';

interface QuestionWithRelations extends Question {
  course?: Course;
  competency?: Competency;
  rubric?: Rubric;
}

interface McqOptionInput {
  id: string;
  text: string;
  is_correct: boolean;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionWithRelations[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [questionType, setQuestionType] = useState<'mcq' | 'scenario' | 'practical'>('mcq');

  const [formData, setFormData] = useState({
    course_id: '',
    competency_id: '',
    question_text: '',
    marks: '10',
    difficulty: 'medium',
    bloom_level: 'remember',
    time_limit_minutes: '',
    rubric_id: '',
    correct_answer: '',
    practical_instructions: '',
    expected_deliverables: '',
  });
  const [options, setOptions] = useState<McqOptionInput[]>([
    { id: '1', text: '', is_correct: false },
    { id: '2', text: '', is_correct: false },
  ]);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/admin/questions';
      if (filterType !== 'all') url += `?question_type=${filterType}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setQuestions(data.data || []);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  const fetchOptions = useCallback(async () => {
    try {
      const [cRes, compRes, rRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/competencies'),
        fetch('/api/admin/rubrics'),
      ]);
      if (cRes.ok) {
        const d = await cRes.json();
        setCourses(d.data || []);
      }
      if (compRes.ok) {
        const d = await compRes.json();
        setCompetencies(d.data || []);
      }
      if (rRes.ok) {
        const d = await rRes.json();
        setRubrics(d.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
    fetchOptions();
  }, [fetchQuestions, fetchOptions]);

  const addOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: '', is_correct: false }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) {
      toast.error('Minimum 2 options required');
      return;
    }
    setOptions(options.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const toggleCorrect = (id: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, is_correct: !o.is_correct } : o)));
  };

  const resetForm = () => {
    setFormData({
      course_id: '',
      competency_id: '',
      question_text: '',
      marks: '10',
      difficulty: 'medium',
      bloom_level: 'remember',
      time_limit_minutes: '',
      rubric_id: '',
      correct_answer: '',
      practical_instructions: '',
      expected_deliverables: '',
    });
    setOptions([
      { id: '1', text: '', is_correct: false },
      { id: '2', text: '', is_correct: false },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.course_id || !formData.question_text.trim() || !formData.marks) {
      toast.error('Course, question text, and marks are required');
      return;
    }

    if (questionType === 'mcq') {
      const validOptions = options.filter((o) => o.text.trim());
      if (validOptions.length < 2) {
        toast.error('At least 2 options with text are required');
        return;
      }
      if (!validOptions.some((o) => o.is_correct)) {
        toast.error('At least one option must be marked as correct');
        return;
      }
    }

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        ...formData,
        question_type: questionType,
        marks: parseInt(formData.marks),
      };

      if (questionType === 'mcq') {
        payload.options = options
          .filter((o) => o.text.trim())
          .map((o) => ({ text: o.text, is_correct: o.is_correct }));
        const correctOpt = options.find((o) => o.is_correct);
        if (correctOpt) payload.correct_answer = correctOpt.text;
      }

      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Question created');
      setDialogOpen(false);
      resetForm();
      fetchQuestions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      mcq: 'default',
      scenario: 'secondary',
      practical: 'outline',
    };
    return <Badge variant={variants[type] || 'secondary'} className="uppercase">{type}</Badge>;
  };

  const getDifficultyBadge = (d: string) => {
    const colors: Record<string, string> = {
      easy: 'bg-green-100 text-green-800 hover:bg-green-100',
      medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      hard: 'bg-red-100 text-red-800 hover:bg-red-100',
    };
    return (
      <Badge className={colors[d] || ''} variant="outline">
        {d}
      </Badge>
    );
  };

  const columns: Column<QuestionWithRelations>[] = [
    {
      key: 'question_text',
      header: 'Question',
      cell: (row) => (
        <span className="font-medium line-clamp-2 max-w-md">{row.question_text}</span>
      ),
    },
    {
      key: 'question_type',
      header: 'Type',
      cell: (row) => getTypeBadge(row.question_type),
    },
    {
      key: 'course',
      header: 'Course',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.course?.title || '-'}</span>
      ),
    },
    {
      key: 'marks',
      header: 'Marks',
      cell: (row) => <span className="text-sm font-medium">{row.marks}</span>,
      sortable: true,
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      cell: (row) => getDifficultyBadge(row.difficulty),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
          <p className="text-muted-foreground mt-1">
            Manage MCQ, scenario, and practical questions
          </p>
        </div>
        <FormDialog
          title="Create Question"
          description="Add a new question to the bank"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={questionType} onValueChange={(v) => setQuestionType(v as 'mcq' | 'scenario' | 'practical')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mcq">MCQ</TabsTrigger>
                <TabsTrigger value="scenario">Scenario</TabsTrigger>
                <TabsTrigger value="practical">Practical</TabsTrigger>
              </TabsList>

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="question_text">Question Text *</Label>
                  <Textarea
                    id="question_text"
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    placeholder="Enter the question"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course_id">Course *</Label>
                    <select
                      id="course_id"
                      value={formData.course_id}
                      onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      required
                    >
                      <option value="">Select course</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="competency_id">Competency</Label>
                    <select
                      id="competency_id"
                      value={formData.competency_id}
                      onChange={(e) => setFormData({ ...formData, competency_id: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="">Select competency</option>
                      {competencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marks">Marks *</Label>
                    <Input
                      id="marks"
                      type="number"
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <select
                      id="difficulty"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloom_level">Bloom Level</Label>
                    <select
                      id="bloom_level"
                      value={formData.bloom_level}
                      onChange={(e) => setFormData({ ...formData, bloom_level: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    >
                      <option value="remember">Remember</option>
                      <option value="understand">Understand</option>
                      <option value="apply">Apply</option>
                      <option value="analyze">Analyze</option>
                      <option value="evaluate">Evaluate</option>
                      <option value="create">Create</option>
                    </select>
                  </div>
                </div>

                {/* MCQ Options */}
                {questionType === 'mcq' && (
                  <div className="space-y-3">
                    <Label>Options * (check correct answer(s))</Label>
                    {options.map((opt, idx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={opt.is_correct}
                          onChange={() => toggleCorrect(opt.id)}
                          className="rounded border-gray-300 h-4 w-4"
                          title="Mark as correct"
                        />
                        <Input
                          value={opt.text}
                          onChange={(e) => updateOption(opt.id, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(opt.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      <Plus className="h-4 w-4 mr-1" /> Add Option
                    </Button>
                  </div>
                )}

                {/* Scenario fields */}
                {questionType === 'scenario' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="correct_answer">Model Answer / Guidelines</Label>
                      <Textarea
                        id="correct_answer"
                        value={formData.correct_answer}
                        onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                        placeholder="Expected answer or scoring guidelines"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rubric_id">Scoring Rubric</Label>
                      <select
                        id="rubric_id"
                        value={formData.rubric_id}
                        onChange={(e) => setFormData({ ...formData, rubric_id: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">Select rubric</option>
                        {rubrics.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
                      <Input
                        id="time_limit_minutes"
                        type="number"
                        value={formData.time_limit_minutes}
                        onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value })}
                        placeholder="e.g. 15"
                      />
                    </div>
                  </div>
                )}

                {/* Practical fields */}
                {questionType === 'practical' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="practical_instructions">Instructions</Label>
                      <Textarea
                        id="practical_instructions"
                        value={formData.practical_instructions}
                        onChange={(e) => setFormData({ ...formData, practical_instructions: e.target.value })}
                        placeholder="Instructions for the practical task"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expected_deliverables">Expected Deliverables</Label>
                      <Textarea
                        id="expected_deliverables"
                        value={formData.expected_deliverables}
                        onChange={(e) => setFormData({ ...formData, expected_deliverables: e.target.value })}
                        placeholder="What the candidate should submit"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pr_rubric_id">Scoring Rubric</Label>
                      <select
                        id="pr_rubric_id"
                        value={formData.rubric_id}
                        onChange={(e) => setFormData({ ...formData, rubric_id: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">Select rubric</option>
                        {rubrics.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </Tabs>

            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Question
            </Button>
          </form>
        </FormDialog>
      </div>

      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="mcq">MCQ</TabsTrigger>
          <TabsTrigger value="scenario">Scenario</TabsTrigger>
          <TabsTrigger value="practical">Practical</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={questions}
        keyExtractor={(row) => row.id}
        searchFields={['question_text']}
        searchPlaceholder="Search questions..."
      />
    </div>
  );
}
