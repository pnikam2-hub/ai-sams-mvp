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
import { Plus, Loader2, ClipboardCheck, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Assessment, Batch, Course } from '@/types';

interface AssessmentWithDetails extends Assessment {
  question_count?: number;
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    batch_id: '',
    course_id: '',
    description: '',
    duration_minutes: '60',
    pass_percentage: '50',
    scheduled_at: '',
  });

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/assessments');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAssessments(data.data || []);
    } catch {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [bRes, cRes] = await Promise.all([
        fetch('/api/admin/batches'),
        fetch('/api/admin/courses'),
      ]);
      if (bRes.ok) {
        const d = await bRes.json();
        setBatches(d.data || []);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        setCourses(d.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
    fetchOptions();
  }, [fetchAssessments, fetchOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.batch_id || !formData.course_id) {
      toast.error('Title, batch, and course are required');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration_minutes: parseInt(formData.duration_minutes),
          pass_percentage: parseInt(formData.pass_percentage),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Assessment created');
      setDialogOpen(false);
      setFormData({
        title: '', batch_id: '', course_id: '', description: '',
        duration_minutes: '60', pass_percentage: '50', scheduled_at: '',
      });
      fetchAssessments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      setPublishingId(id);
      const res = await fetch(`/api/admin/assessments/${id}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to publish');
      }
      toast.success('Assessment published');
      fetchAssessments();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      scheduled: 'outline',
      active: 'default',
      completed: 'default',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const columns: Column<AssessmentWithDetails>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (row) => <span className="font-medium">{row.title}</span>,
      sortable: true,
    },
    {
      key: 'batch',
      header: 'Batch',
      cell: (row) => <span className="text-sm">{row.batch?.name || '-'}</span>,
    },
    {
      key: 'course',
      header: 'Course',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.course?.title || '-'}</span>
      ),
    },
    {
      key: 'duration_minutes',
      header: 'Duration',
      cell: (row) => <span className="text-sm">{row.duration_minutes} min</span>,
    },
    {
      key: 'pass_percentage',
      header: 'Pass %',
      cell: (row) => <span className="text-sm">{row.pass_percentage}%</span>,
    },
    {
      key: 'question_count',
      header: 'Questions',
      cell: (row) => (
        <Badge variant="outline" className="font-mono">
          {typeof row.question_count === 'number' ? row.question_count : 0}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        row.status === 'draft' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePublish(row.id)}
            disabled={publishingId === row.id}
          >
            {publishingId === row.id ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Publish
          </Button>
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
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
          <h1 className="text-2xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage assessments
          </p>
        </div>
        <FormDialog
          title="Create Assessment"
          description="Set up a new assessment"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Assessment
            </Button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Assessment title"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_id">Batch *</Label>
                <select
                  id="batch_id"
                  value={formData.batch_id}
                  onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value="">Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Assessment description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duration (min) *</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass_percentage">Pass %</Label>
                <Input
                  id="pass_percentage"
                  type="number"
                  value={formData.pass_percentage}
                  onChange={(e) => setFormData({ ...formData, pass_percentage: e.target.value })}
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Schedule Date</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Assessment
            </Button>
          </form>
        </FormDialog>
      </div>

      <DataTable
        columns={columns}
        data={assessments}
        keyExtractor={(row) => row.id}
        searchFields={['title']}
        searchPlaceholder="Search assessments..."
      />
    </div>
  );
}
