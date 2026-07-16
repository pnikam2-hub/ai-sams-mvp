'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { FormDialog } from '@/components/form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TrainingCentre } from '@/types';

export default function TrainingCentresPage() {
  const [centres, setCentres] = useState<TrainingCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    contact_email: '',
    contact_phone: '',
  });

  const fetchCentres = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/training-centres');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCentres(data.data || []);
    } catch {
      toast.error('Failed to load training centres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCentres();
  }, [fetchCentres]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Centre name is required');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/admin/training-centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create');
      }
      toast.success('Training centre created');
      setDialogOpen(false);
      setFormData({ name: '', address: '', city: '', state: '', contact_email: '', contact_phone: '' });
      fetchCentres();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<TrainingCentre>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => <span className="font-medium">{row.name}</span>,
      sortable: true,
    },
    {
      key: 'city',
      header: 'City',
      cell: (row) => row.city || '-',
    },
    {
      key: 'state',
      header: 'State',
      cell: (row) => row.state || '-',
    },
    {
      key: 'contact_email',
      header: 'Email',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.contact_email || '-'}</span>
      ),
    },
    {
      key: 'contact_phone',
      header: 'Phone',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.contact_phone || '-'}</span>
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
          <h1 className="text-2xl font-bold tracking-tight">Training Centres</h1>
          <p className="text-muted-foreground mt-1">
            Manage training centres across regions
          </p>
        </div>
        <FormDialog
          title="Add Training Centre"
          description="Create a new training centre"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Centre
            </Button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Centre Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter centre name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="contact@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Centre
            </Button>
          </form>
        </FormDialog>
      </div>

      <DataTable
        columns={columns}
        data={centres}
        keyExtractor={(row) => row.id}
        searchFields={['name', 'city', 'state']}
        searchPlaceholder="Search centres..."
      />
    </div>
  );
}
