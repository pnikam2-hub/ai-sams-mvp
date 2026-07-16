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
import { Plus, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Competency, NSQFLevel } from '@/types';

interface CompetencyWithLevel extends Competency {
  nsqf_level?: NSQFLevel;
}

export default function CompetenciesPage() {
  const [competencies, setCompetencies] = useState<CompetencyWithLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nsqf_level_id: '1',
    code: '',
    title: '',
    description: '',
    type: 'core',
    learning_outcomes: '',
    knowledge_elements: '',
    skill_elements: '',
  });

  const fetchCompetencies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/competencies');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCompetencies(data.data || []);
    } catch {
      toast.error('Failed to load competencies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetencies();
  }, [fetchCompetencies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.title.trim()) {
      toast.error('Code and title are required');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/competencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          learning_outcomes: formData.learning_outcomes
            ? formData.learning_outcomes.split('\n').filter(Boolean)
            : [],
          knowledge_elements: formData.knowledge_elements
            ? formData.knowledge_elements.split('\n').filter(Boolean)
            : [],
          skill_elements: formData.skill_elements
            ? formData.skill_elements.split('\n').filter(Boolean)
            : [],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Competency created');
      setDialogOpen(false);
      setFormData({
        nsqf_level_id: '1',
        code: '',
        title: '',
        description: '',
        type: 'core',
        learning_outcomes: '',
        knowledge_elements: '',
        skill_elements: '',
      });
      fetchCompetencies();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<CompetencyWithLevel>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (row) => <Badge variant="outline">{row.code}</Badge>,
      sortable: true,
    },
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
        <span className="text-sm">
          Level {row.nsqf_level_id}
          {row.nsqf_level ? ` - ${row.nsqf_level.title}` : ''}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => (
        <Badge variant={row.type === 'core' ? 'default' : 'secondary'}>
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'learning_outcomes',
      header: 'Outcomes',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.learning_outcomes?.length || 0} outcomes
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
          <h1 className="text-2xl font-bold tracking-tight">Competencies</h1>
          <p className="text-muted-foreground mt-1">
            NSQF competency framework management
          </p>
        </div>
        <FormDialog
          title="Create Competency"
          description="Add a new NSQF competency"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Competency
            </Button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. CSC/N1234"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nsqf_level_id">NSQF Level *</Label>
                <select
                  id="nsqf_level_id"
                  value={formData.nsqf_level_id}
                  onChange={(e) => setFormData({ ...formData, nsqf_level_id: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {Array.from({ length: 10 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Level {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Competency title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="core">Core</option>
                <option value="non_core">Non-Core</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning_outcomes">Learning Outcomes (one per line)</Label>
              <Textarea
                id="learning_outcomes"
                value={formData.learning_outcomes}
                onChange={(e) => setFormData({ ...formData, learning_outcomes: e.target.value })}
                placeholder="Enter learning outcomes, one per line"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="knowledge_elements">Knowledge Elements</Label>
                <Textarea
                  id="knowledge_elements"
                  value={formData.knowledge_elements}
                  onChange={(e) => setFormData({ ...formData, knowledge_elements: e.target.value })}
                  placeholder="One per line"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill_elements">Skill Elements</Label>
                <Textarea
                  id="skill_elements"
                  value={formData.skill_elements}
                  onChange={(e) => setFormData({ ...formData, skill_elements: e.target.value })}
                  placeholder="One per line"
                  rows={2}
                />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Competency
            </Button>
          </form>
        </FormDialog>
      </div>

      <DataTable
        columns={columns}
        data={competencies}
        keyExtractor={(row) => row.id}
        searchFields={['code', 'title', 'description']}
        searchPlaceholder="Search competencies..."
      />
    </div>
  );
}
