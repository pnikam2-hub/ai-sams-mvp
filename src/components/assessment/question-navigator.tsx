'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle, Circle, Flag } from 'lucide-react';

export type QuestionStatus = 'answered' | 'unanswered' | 'flagged' | 'current';

interface QuestionNavigatorProps {
  questions: {
    id: string;
    index: number;
    status: QuestionStatus;
    section: string;
  }[];
  currentIndex: number;
  onQuestionClick: (index: number) => void;
  className?: string;
}

function getStatusStyles(status: QuestionStatus): string {
  switch (status) {
    case 'answered':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700';
    case 'flagged':
      return 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700';
    case 'current':
      return 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 ring-2 ring-primary/30';
    case 'unanswered':
    default:
      return 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  }
}

function getStatusIcon(status: QuestionStatus) {
  switch (status) {
    case 'answered':
      return <CheckCircle className="w-3 h-3" />;
    case 'flagged':
      return <Flag className="w-3 h-3" />;
    case 'current':
      return <Circle className="w-3 h-3 fill-current" />;
    default:
      return null;
  }
}

function getStatusLabel(status: QuestionStatus): string {
  switch (status) {
    case 'answered':
      return 'Answered';
    case 'flagged':
      return 'Flagged for review';
    case 'current':
      return 'Current question';
    default:
      return 'Not answered';
  }
}

export function QuestionNavigator({
  questions,
  currentIndex,
  onQuestionClick,
  className,
}: QuestionNavigatorProps) {
  // Group questions by section
  const grouped = questions.reduce<Record<string, typeof questions>>((acc, q) => {
    if (!acc[q.section]) acc[q.section] = [];
    acc[q.section].push(q);
    return acc;
  }, {});

  const summary = {
    total: questions.length,
    answered: questions.filter(q => q.status === 'answered').length,
    flagged: questions.filter(q => q.status === 'flagged').length,
    unanswered: questions.filter(q => q.status === 'unanswered' || q.status === 'current').length,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('flex flex-col h-full', className)}>
        {/* Summary stats */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Questions
          </h3>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-600 dark:text-slate-400">{summary.answered}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-600 dark:text-slate-400">{summary.flagged}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="text-slate-600 dark:text-slate-400">
                {summary.total - summary.answered}
              </span>
            </div>
            <div className="ml-auto text-slate-500 dark:text-slate-400">
              {summary.answered}/{summary.total}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${summary.total > 0 ? (summary.answered / summary.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Question grid */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {Object.entries(grouped).map(([section, sectionQuestions]) => (
              <div key={section}>
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 px-1">
                  {section}
                </h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {sectionQuestions.map((question) => {
                    const isCurrent = question.index === currentIndex;
                    const displayStatus = isCurrent ? 'current' : question.status;

                    return (
                      <Tooltip key={question.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              'h-9 w-full p-0 text-xs font-medium border transition-all duration-150 relative',
                              getStatusStyles(displayStatus),
                              isCurrent && 'font-bold'
                            )}
                            onClick={() => onQuestionClick(question.index)}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(displayStatus)}
                              {question.index + 1}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">
                            Q{question.index + 1}: {getStatusLabel(displayStatus)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" /> Answered
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400" /> Flagged
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Unanswered
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" /> Current
            </span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default QuestionNavigator;
