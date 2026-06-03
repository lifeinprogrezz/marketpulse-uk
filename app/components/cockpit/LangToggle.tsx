'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Lang } from '@/app/lib/i18n';

interface Props {
  active: Lang;
  englishLabel: string;
  spanishLabel: string;
}

/**
 * Header segmented control for switching the UI between English and
 * Spanish. State lives in `?lang=` URL search param so it's shareable
 * and server-readable. Preserves all other params (unit, granularity)
 * on click.
 */
export default function LangToggle({ active, englishLabel, spanishLabel }: Props) {
  const params = useSearchParams();

  function hrefFor(l: Lang): string {
    const next = new URLSearchParams(params?.toString() ?? '');
    next.set('lang', l);
    return `/?${next.toString()}`;
  }

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-neutral-200 text-xs dark:border-neutral-800">
      <Link
        href={hrefFor('en')}
        scroll={false}
        prefetch={false}
        aria-pressed={active === 'en'}
        className={`px-3 py-1.5 font-medium transition-colors ${
          active === 'en'
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900'
        }`}
      >
        {englishLabel}
      </Link>
      <Link
        href={hrefFor('es')}
        scroll={false}
        prefetch={false}
        aria-pressed={active === 'es'}
        className={`border-l border-neutral-200 px-3 py-1.5 font-medium transition-colors dark:border-neutral-800 ${
          active === 'es'
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900'
        }`}
      >
        {spanishLabel}
      </Link>
    </div>
  );
}
