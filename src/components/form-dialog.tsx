'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface FormDialogProps {
  title: string;
  description?: string;
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function FormDialog({
  title,
  description,
  trigger,
  children,
  open,
  onOpenChange,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className={cn('max-w-2xl max-h-[90vh] overflow-y-auto', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
