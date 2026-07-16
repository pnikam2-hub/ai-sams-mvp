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
import { Plus, Loader2, Trash2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Rubric } from '@/types';

interface CriterionInput {
  id: string;
  criterion: string;
  max_score: string;
  description: string;
}

export default function RubricsPage() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [criteria, setCriteria] = useState<CriterionInput[]>([
    { id: '1', criterion: '', max_score: '5', description: '' },
  ]);

  const fetchRubrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/rubrics');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRubrics(data.data || []);
    } catch {
      toast.error('Failed to load rubrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRubrics();
  }, [fetchRubrics]);

  const addCriterion = () => {
    setCriteria([...criteria, { id: Date.now().toString(), criterion: '', max_score: '5', description: '' }]);
  };

  const removeCriterion = (id: string) => {
    if (criteria.length <= 1) {
      toast.error('At least one criterion is required');
      return;
    }
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const updateCriterion = (id: string, field: keyof CriterionInput, value: string) => {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    const validCriteria = criteria.filter((c) => c.criterion.trim() && c.max_score);
    if (validCriteria.length === 0) {
      toast.error('At least one valid criterion is required');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          criteria: validCriteria.map((c) => ({
            criterion: c.criterion,
            max_score: parseInt(c.max_score),
            description: c.description,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Rubric created');
      setDialogOpen(false);
      setFormData({ title: '', description: '' });
      setCriteria([{ id: '1', criterion: '', max_score: '5', description: '' }]);
      fetchRubrics();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Rubric>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (row) => <span className="font-medium">{row.title}</span>,
      sortable: true,
    },
    {
      key: 'criteria',
      header: 'Criteria',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.criteria?.length || 0} criteria
        </span>
      ),
    },
    {
      key: 'max_total_score',
      header: 'Max Score',
      cell: (row) => (
        <Badge variant="outline" className="font-mono">
          {row.max_total_score}
        </Badge>
      ),
      sortable: true,
    },
    {
      key: 'description',
      header: 'Description',
      cell: (row) => (
        <span className="text-sm text-muted-foreground truncate max-w-xs block">
          {row.description || '-'}
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
          <h1 className="text-2xl font-bold tracking-tight">Rubrics</h1>
          <p className="text-muted-foreground mt-1">
            Define scoring rubrics for assessments
          </p>
        </div>
        <FormDialog
          title="Create Rubric"
          description="Define scoring criteria"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rubric
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
                placeholder="Rubric title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this rubric"
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Criteria *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
                  <Plus className="h-4 w-4 mr-1" /> Add Criterion
                </Button>
              </div>
              {criteria.map((c, idx) => (
                <div key={c.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Criterion {idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCriterion(c.id)}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={c.criterion}
                      onChange={(e) => updateCriterion(c.id, 'criterion', e.target.value)}
                      placeholder="Criterion name"
                    />
                    <Input
                      type="number"
                      value={c.max_score}
                      onChange={(e) => updateCriterion(c.id, 'max_score', e.target.value)}
                      placeholder="Max score"
                    />
                  </div>
                  <Textarea
                    value={c.description}
                    onChange={(e) => updateCriterion(c.id, 'description', e.target.value)}
                    placeholder="Description of what this criterion measures"
                    rows={2}
                  />
                </div>
              ))}
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Rubric
            </Button>
          </form>
        </FormDialog>
      </div>

      <DataTable
        columns={columns}
        data={rubrics}
        keyExtractor={(row) => row.id}
        searchFields={['title', 'description']}
        searchPlaceholder="Search rubrics..."
      />
    </div>
  );
}
