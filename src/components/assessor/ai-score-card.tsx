'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Bot,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { AIScoreSuggestion } from '@/types';

interface AIScoreCardProps {
  aiSuggestion: AIScoreSuggestion | null;
  maxScore: number;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
  if (confidence >= 0.5) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
  return 'text-red-600 bg-red-50 dark:bg-red-900/20';
}

function getConfidenceBarColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-emerald-500';
  if (confidence >= 0.5) return 'bg-amber-500';
  return 'bg-red-500';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

export function AIScoreCard({
  aiSuggestion,
  maxScore,
  onRegenerate,
  isLoading = false,
}: AIScoreCardProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  if (!aiSuggestion) {
    return (
      <Card className="border-dashed border-muted-foreground/25">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bot className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                No AI Score Available
              </p>
              <p className="text-xs text-muted-foreground">
                AI scoring has not been generated for this answer yet.
              </p>
            </div>
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isLoading}
                className="mt-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Generate AI Score
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const suggestedScore = aiSuggestion.suggested_score;
  const confidence = aiSuggestion.confidence;
  const percentage = maxScore > 0 ? Math.round((suggestedScore / maxScore) * 100) : 0;
  const confidenceColor = getConfidenceColor(confidence);
  const confidenceBarColor = getConfidenceBarColor(confidence);
  const confidenceLabel = getConfidenceLabel(confidence);

  return (
    <Card className={cn('overflow-hidden', confidence < 0.5 && 'border-red-200 dark:border-red-800')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">AI Score Suggestion</CardTitle>
            <Badge variant="secondary" className="text-[10px] h-5">
              Draft - Not Final
            </Badge>
          </div>
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onRegenerate}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isLoading && 'animate-spin')} />
              Regenerate
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score and Confidence Row */}
        <div className="flex items-center gap-4">
          {/* Score Badge */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted px-4 py-3 min-w-[80px]">
            <span className="text-2xl font-bold tabular-nums">{suggestedScore}</span>
            <span className="text-xs text-muted-foreground">/ {maxScore}</span>
          </div>

          {/* Confidence Meter */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Confidence</span>
              <div className="flex items-center gap-1.5">
                <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', confidenceColor)}>
                  {confidenceLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', confidenceBarColor)}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Score: {percentage}% of maximum
            </p>
          </div>
        </div>

        {/* Low Confidence Warning */}
        {confidence < 0.5 && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:bg-red-900/20 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-700 dark:text-red-400">
                Low Confidence Warning
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                The AI has low confidence in this score. Please review carefully and consider
                manual assessment.
              </p>
            </div>
          </div>
        )}

        {/* Explanation Section */}
        {aiSuggestion.explanation && (
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-medium">AI Explanation</span>
              {showExplanation ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {showExplanation && (
              <div className="px-3 py-2 border-t bg-muted/20">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {aiSuggestion.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rubric Feedback Table */}
        {aiSuggestion.rubric_feedback && aiSuggestion.rubric_feedback.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs font-medium">Rubric Feedback ({aiSuggestion.rubric_feedback.length})</span>
              {showFeedback ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {showFeedback && (
              <div className="border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs h-8">Criterion</TableHead>
                      <TableHead className="text-xs h-8 w-16 text-center">Score</TableHead>
                      <TableHead className="text-xs h-8">Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiSuggestion.rubric_feedback.map((feedback, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-xs py-2 font-medium">
                          {feedback.criterion}
                        </TableCell>
                        <TableCell className="text-xs py-2 text-center tabular-nums">
                          {feedback.score}
                        </TableCell>
                        <TableCell className="text-xs py-2 text-muted-foreground">
                          {feedback.feedback}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Model Info */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
          <span>Model: {aiSuggestion.model}</span>
          <span>{new Date(aiSuggestion.created_at).toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
