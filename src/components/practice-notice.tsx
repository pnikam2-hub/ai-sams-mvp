import Link from 'next/link';
import { Info } from 'lucide-react';

/**
 * Persistent, unmissable statement of scope. Shown wherever a score or result is
 * presented, so that no reader can mistake a practice report for a qualification.
 */
export function PracticeNotice({
  className = '',
  showLink = true,
}: {
  className?: string;
  showLink?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 ${className}`}
    >
      <span className="inline-flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <strong>Practice report — not a qualification.</strong> AI-SAMS is an independent
          practice and self-assessment tool. It is not affiliated with, endorsed by, or recognised
          by NCVET, MSDE, any Sector Skill Council, or any government body, and issues no
          certificate or credit.
          {showLink && (
            <>
              {' '}
              <Link href="/disclaimer" className="font-medium underline underline-offset-2">
                Read the disclaimer
              </Link>
              .
            </>
          )}
        </span>
      </span>
    </div>
  );
}
