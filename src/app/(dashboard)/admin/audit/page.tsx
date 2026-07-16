'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/components/data-table';
import type { Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditLog } from '@/types';

interface AuditLogWithUser extends Omit<AuditLog, 'performed_by_user'> {
  performed_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

const TABLE_OPTIONS = [
  'users', 'roles', 'training_centres', 'courses', 'batches',
  'candidates', 'competencies', 'questions', 'rubrics', 'assessments',
  'candidate_attempts', 'final_results',
];

const ACTION_OPTIONS = ['create', 'update', 'delete', 'score', 'approve'];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableName, setTableName] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/admin/audit-logs?limit=100';
      if (tableName) url += `&table_name=${tableName}`;
      if (action) url += `&action=${action}`;
      if (fromDate) url += `&from=${fromDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLogs(data.data || []);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [tableName, action, fromDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      create: 'default',
      update: 'secondary',
      delete: 'destructive',
      score: 'outline',
      approve: 'default',
    };
    return <Badge variant={variants[action] || 'secondary'} className="capitalize">{action}</Badge>;
  };

  const columns: Column<AuditLogWithUser>[] = [
    {
      key: 'action',
      header: 'Action',
      cell: (row) => getActionBadge(row.action),
    },
    {
      key: 'table_name',
      header: 'Table',
      cell: (row) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.table_name}
        </Badge>
      ),
    },
    {
      key: 'record_id',
      header: 'Record',
      cell: (row) => (
        <span className="text-xs text-muted-foreground font-mono truncate max-w-24 block">
          {row.record_id}
        </span>
      ),
    },
    {
      key: 'performed_by',
      header: 'Performed By',
      cell: (row) => (
        <span className="text-sm">
          {row.performed_by_user?.full_name || row.performed_by}
        </span>
      ),
    },
    {
      key: 'performed_at',
      header: 'Date & Time',
      cell: (row) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {new Date(row.performed_at).toLocaleString()}
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          Track all changes across the system
        </p>
      </div>

      <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-card">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Table</label>
          <select
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">All Tables</option>
            {TABLE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Action</label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="">All Actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        keyExtractor={(row) => row.id}
        searchable={false}
        pageSize={20}
      />
    </div>
  );
}
