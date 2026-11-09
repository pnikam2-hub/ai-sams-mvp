import Link from 'next/link';

/**
 * AI Native Organisations brand lockup. Cormorant Garamond for the serif line,
 * uppercase Manrope with wide tracking for the parent-brand eyebrow — the same
 * treatment used on ainativeorganisations.com.
 */
export function Wordmark({
  href = '/',
  size = 'md',
  showParent = true,
  invert = false,
}: {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  showParent?: boolean;
  invert?: boolean;
}) {
  const titleSize =
    size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-xl';
  const parentSize = size === 'lg' ? 'text-[11px]' : 'text-[10px]';

  return (
    <Link href={href} className="group inline-flex flex-col leading-none">
      {showParent && (
        <span
          className={`${parentSize} mb-1 font-semibold uppercase tracking-[0.18em] ${
            invert ? 'text-[#c5a059]' : 'text-primary'
          }`}
        >
          AI Native Organisations
        </span>
      )}
      <span
        className={`${titleSize} font-semibold tracking-tight transition-colors group-hover:text-primary`}
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        AI Skills Practice
      </span>
    </Link>
  );
}

export function BrandLine({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      A practice tool from{' '}
      <a
        href="https://ainativeorganisations.com"
        className="underline underline-offset-2 hover:text-primary"
      >
        AI Native Organisations
      </a>
      . No qualification or certificate is issued.
    </p>
  );
}
