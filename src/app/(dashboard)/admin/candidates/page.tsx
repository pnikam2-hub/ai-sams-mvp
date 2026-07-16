'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Candidate, TrainingCentre } from '@/types';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [centres, setCentres] = useState<TrainingCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    education: '',
    training_centre_id: '',
  });

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/candidates');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCandidates(data.data || []);
    } catch {
      toast.error('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCentres = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/training-centres');
      if (res.ok) {
        const d = await res.json();
        setCentres(d.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
    fetchCentres();
  }, [fetchCandidates, fetchCentres]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Candidate registered');
      setDialogOpen(false);
      setFormData({ full_name: '', email: '', phone: '', date_of_birth: '', gender: '', education: '', training_centre_id: '' });
      fetchCandidates();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      registered: 'secondary',
      active: 'default',
      completed: 'outline',
      dropped: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const columns: Column<Candidate>[] = [
    {
      key: 'full_name',
      header: 'Name',
      cell: (row) => <span className="font-medium">{row.full_name}</span>,
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.email || '-'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.phone || '-'}</span>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      cell: (row) => (
        <span className="capitalize text-sm">{row.gender || '-'}</span>
      ),
    },
    {
      key: 'education',
      header: 'Education',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.education || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => getStatusBadge(row.status),
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
          <h1 className="text-2xl font-bold tracking-tight">Candidates</h1>
          <p className="text-muted-foreground mt-1">
            Register and manage candidates
          </p>
        </div>
        <FormDialog
          title="Register Candidate"
          description="Add a new candidate to the system"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Register
            </Button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Full name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="education">Education</Label>
              <Input
                id="education"
                value={formData.education}
                onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                placeholder="Highest education qualification"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="training_centre_id">Training Centre</Label>
              <select
                id="training_centre_id"
                value={formData.training_centre_id}
                onChange={(e) => setFormData({ ...formData, training_centre_id: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">Select centre</option>
                {centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Register Candidate
            </Button>
          </form>
        </FormDialog>
      </div>

      <DataTable
        columns={columns}
        data={candidates}
        keyExtractor={(row) => row.id}
        searchFields={['full_name', 'email', 'phone']}
        searchPlaceholder="Search candidates..."
      />
    </div>
  );
}
