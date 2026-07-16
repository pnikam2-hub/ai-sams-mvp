'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Batch, Course, TrainingCentre } from '@/types';

interface BatchWithDetails extends Batch {
  candidate_count?: number;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchWithDetails[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [centres, setCentres] = useState<TrainingCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    training_centre_id: '',
    start_date: '',
    end_date: '',
    assessment_date: '',
    max_candidates: '30',
  });

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/batches');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBatches(data.data || []);
    } catch {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        fetch('/api/admin/courses'),
        fetch('/api/admin/training-centres'),
      ]);
      if (cRes.ok) {
        const d = await cRes.json();
        setCourses(d.data || []);
      }
      if (tRes.ok) {
        const d = await tRes.json();
        setCentres(d.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchOptions();
  }, [fetchBatches, fetchOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.course_id || !formData.training_centre_id) {
      toast.error('Name, course, and training centre are required');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          max_candidates: parseInt(formData.max_candidates) || 30,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Batch created');
      setDialogOpen(false);
      setFormData({ name: '', course_id: '', training_centre_id: '', start_date: '', end_date: '', assessment_date: '', max_candidates: '30' });
      fetchBatches();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      upcoming: 'secondary',
      active: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const columns: Column<BatchWithDetails>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => <span className="font-medium">{row.name}</span>,
      sortable: true,
    },
    {
      key: 'course',
      header: 'Course',
      cell: (row) => (
        <span className="text-sm">{row.course?.title || '-'}</span>
      ),
    },
    {
      key: 'training_centre',
      header: 'Centre',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.training_centre?.name || '-'}
        </span>
      ),
    },
    {
      key: 'candidate_count',
      header: 'Candidates',
      cell: (row) => (
        <span className="text-sm">
          {typeof row.candidate_count === 'number' ? row.candidate_count : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => getStatusBadge(row.status),
    },
    {
      key: 'start_date',
      header: 'Start Date',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.start_date ? new Date(row.start_date).toLocaleDateString() : '-'}
        </span>
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
          <h1 className="text-2xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground mt-1">
            Manage training batches and enrollments
          </p>
        </div>
        <FormDialog
          title="Create Batch"
          description="Set up a new training batch"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Batch
            </Button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Batch 2024-A"
                required
              />
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
            <div className="space-y-2">
              <Label htmlFor="training_centre_id">Training Centre *</Label>
              <select
                id="training_centre_id"
                value={formData.training_centre_id}
                onChange={(e) => setFormData({ ...formData, training_centre_id: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
              >
                <option value="">Select centre</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assessment_date">Assessment Date</Label>
                <Input
                  id="assessment_date"
                  type="date"
                  value={formData.assessment_date}
                  onChange={(e) => setFormData({ ...formData, assessment_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_candidates">Max Candidates</Label>
                <Input
                  id="max_candidates"
                  type="number"
                  value={formData.max_candidates}
                  onChange={(e) => setFormData({ ...formData, max_candidates: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Batch
            </Button>
          </form>
        </FormDialog>
      </div>

      <DataTable
        columns={columns}
        data={batches}
        keyExtractor={(row) => row.id}
        searchFields={['name']}
        searchPlaceholder="Search batches..."
      />
    </div>
  );
}
