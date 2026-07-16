'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  UserCheck,
  AlertCircle,
  ArrowRight,
  Minus,
} from 'lucide-react';
import type { AssessorScore } from '@/types';

export type ScoreStatus = 'draft' | 'approved' | 'rejected' | 'reassess';

interface ScoreEditorProps {
  answerId: string;
  attemptId: string;
  aiSuggestedScore?: number;
  maxScore: number;
  existingScore?: AssessorScore | null;
  onSave: (data: {
    answerId: string;
    attemptId: string;
    finalScore: number;
    maxScore: number;
    vivaRemarks: string;
    status: ScoreStatus;
  }) => void;
  isSaving?: boolean;
}

function getStatusBadgeVariant(status: ScoreStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'draft':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    case 'reassess':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getStatusLabel(status: ScoreStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'draft':
      return 'Draft';
    case 'rejected':
      return 'Rejected';
    case 'reassess':
      return 'Needs Reassessment';
    default:
      return status;
  }
}

export function ScoreEditor({
  answerId,
  attemptId,
  aiSuggestedScore,
  maxScore,
  existingScore,
  onSave,
  isSaving = false,
}: ScoreEditorProps) {
  const [finalScore, setFinalScore] = useState<string>(
    existingScore?.final_score?.toString() || ''
  );
  const [vivaRemarks, setVivaRemarks] = useState(existingScore?.viva_remarks || '');
  const [status, setStatus] = useState<ScoreStatus>(
    existingScore?.status || 'draft'
  );
  const [validationError, setValidationError] = useState<string>('');

  // Sync with existing score when it changes
  useEffect(() => {
    if (existingScore) {
      setFinalScore(existingScore.final_score.toString());
      setVivaRemarks(existingScore.viva_remarks || '');
      setStatus(existingScore.status);
    }
  }, [existingScore]);

  const numericScore = parseFloat(finalScore);
  const isValidScore = !isNaN(numericScore) && numericScore >= 0 && numericScore <= maxScore;
  const percentage = maxScore > 0 && isValidScore ? Math.round((numericScore / maxScore) * 100) : 0;

  const aiDiff = aiSuggestedScore !== undefined && isValidScore
    ? numericScore - aiSuggestedScore
    : null;

  const handleSave = () => {
    if (!isValidScore) {
      setValidationError(`Score must be a number between 0 and ${maxScore}`);
      return;
    }

    if (status === 'approved' && !finalScore) {
      setValidationError('A score is required when approving');
      return;
    }

    setValidationError('');
    onSave({
      answerId,
      attemptId,
      finalScore: numericScore,
      maxScore,
      vivaRemarks,
      status,
    });
  };

  // Auto-calculate suggested status based on AI score proximity
  const suggestedStatus: ScoreStatus = aiSuggestedScore !== undefined && isValidScore
    ? Math.abs(numericScore - aiSuggestedScore) <= 1
      ? 'approved'
      : 'draft'
    : 'draft';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Assessor Score</CardTitle>
            {existingScore && (
              <Badge variant={getStatusBadgeVariant(status)} className="text-[10px] h-5">
                {getStatusLabel(status)}
              </Badge>
            )}
          </div>
          {existingScore?.assessed_at && (
            <span className="text-[10px] text-muted-foreground">
              Last: {new Date(existingScore.assessed_at).toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Input Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`score-${answerId}`} className="text-xs font-medium">
              Final Score
            </Label>
            {aiSuggestedScore !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>AI Suggested: <strong>{aiSuggestedScore}</strong></span>
                <ArrowRight className="h-3 w-3" />
                {isValidScore && (
                  <span
                    className={cn(
                      'font-semibold',
                      aiDiff === 0
                        ? 'text-emerald-600'
                        : aiDiff && aiDiff > 0
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    )}
                  >
                    {aiDiff === 0 ? 'Same' : aiDiff && aiDiff > 0 ? `+${aiDiff}` : aiDiff}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id={`score-${answerId}`}
                type="number"
                min={0}
                max={maxScore}
                step={0.5}
                value={finalScore}
                onChange={(e) => {
                  setFinalScore(e.target.value);
                  setValidationError('');
                }}
                placeholder="0"
                className={cn(
                  'tabular-nums text-lg font-semibold',
                  validationError && 'border-destructive'
                )}
              />
            </div>
            <span className="text-sm text-muted-foreground font-medium">/ {maxScore}</span>
          </div>
          {isValidScore && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    percentage >= 70
                      ? 'bg-emerald-500'
                      : percentage >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{percentage}%</span>
            </div>
          )}
          {validationError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {validationError}
            </p>
          )}
        </div>

        <Separator />

        {/* Viva Remarks */}
        <div className="space-y-2">
          <Label htmlFor={`remarks-${answerId}`} className="text-xs font-medium">
            Viva Remarks
          </Label>
          <Textarea
            id={`remarks-${answerId}`}
            value={vivaRemarks}
            onChange={(e) => setVivaRemarks(e.target.value)}
            placeholder="Enter your assessment remarks, viva notes, or feedback..."
            className="min-h-20 text-sm resize-y"
          />
        </div>

        {/* Status Select */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as ScoreStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">
                <div className="flex items-center gap-2">
                  <Minus className="h-3 w-3" />
                  Draft
                </div>
              </SelectItem>
              <SelectItem value="approved">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3 w-3" />
                  Approved
                </div>
              </SelectItem>
              <SelectItem value="rejected">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3" />
                  Rejected
                </div>
              </SelectItem>
              <SelectItem value="reassess">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3" />
                  Reassess
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {status === 'approved' && suggestedStatus !== 'approved' && isValidScore && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Your score differs from the AI suggestion. Please ensure this is intentional.
            </p>
          )}
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !isValidScore}
          className="w-full"
          size="sm"
        >
          {isSaving ? (
            <>
              <Minus className="h-4 w-4 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1.5" />
              Save Score
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
