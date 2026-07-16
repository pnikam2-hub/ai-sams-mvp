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
import { Plus, Loader2, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import type { Course, Competency } from '@/types';

interface CourseWithCompetencies extends Omit<Course, 'competencies'> {
  competencies?: Array<{
    id?: string;
    course_id?: string;
    competency_id?: string;
    competency?: Competency;
    weight_percentage: number;
  }>;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseWithCompetencies[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    nsqf_level: '1',
    duration_hours: '',
    competency_ids: [] as string[],
  });

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/courses');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCourses(data.data || []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompetencies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/competencies');
      if (res.ok) {
        const data = await res.json();
        setCompetencies(data.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchCompetencies();
  }, [fetchCourses, fetchCompetencies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Course created');
      setDialogOpen(false);
      setFormData({ title: '', description: '', nsqf_level: '1', duration_hours: '', competency_ids: [] });
      fetchCourses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const toggleCompetency = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      competency_ids: prev.competency_ids.includes(id)
        ? prev.competency_ids.filter((c) => c !== id)
        : [...prev.competency_ids, id],
    }));
  };

  const columns: Column<CourseWithCompetencies>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (row) => <span className="font-medium">{row.title}</span>,
      sortable: true,
    },
    {
      key: 'nsqf_level',
      header: 'NSQF Level',
      cell: (row) => (
        <Badge variant="outline">Level {row.nsqf_level}</Badge>
      ),
      sortable: true,
    },
    {
      key: 'duration_hours',
      header: 'Duration',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.duration_hours ? `${row.duration_hours} hrs` : '-'}
        </span>
      ),
    },
    {
      key: 'competencies',
      header: 'Competencies',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.competencies?.length || 0} mapped
        </span>
      ),
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
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">
            Manage courses and competency mappings
          </p>
        </div>
        <FormDialog
          title="Create Course"
          description="Add a new course with NSQF level"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Course
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
                placeholder="Course title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Course description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nsqf_level">NSQF Level *</Label>
                <select
                  id="nsqf_level"
                  value={formData.nsqf_level}
                  onChange={(e) => setFormData({ ...formData, nsqf_level: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Level {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_hours">Duration (hours)</Label>
                <Input
                  id="duration_hours"
                  type="number"
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                  placeholder="e.g. 120"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Map Competencies</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {competencies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No competencies available</p>
                ) : (
                  competencies.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.competency_ids.includes(c.id)}
                        onChange={() => toggleCompetency(c.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">
                        {c.code} - {c.title}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Course
            </Button>
          </form>
        </FormDialog>
      </div>

      <DataTable
        columns={columns}
        data={courses}
        keyExtractor={(row) => row.id}
        searchFields={['title', 'description']}
        searchPlaceholder="Search courses..."
      />
    </div>
  );
}
