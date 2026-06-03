'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export type Granularity = 'monthly' | 'weekly';

interface Props {
  active: Granularity;
  monthlyLabel: string;
  weeklyLabel: string;
}

/**
 * Chart-header segmented control to switch the forecast chart between
 * monthly and weekly granularity. Weekly is derived from monthly by
 * equal-splitting each month's value into 4 weeks — the simplest
 * defensible derivation when the source data itself is monthly.
 *
 * State lives in the `?granularity=` URL search param. Preserves all
 * other params (unit, etc.) when toggling.
 */
export default function GranularityToggle({ active, monthlyLabel, weeklyLabel }: Props) {
  const params = useSearchParams();

  function hrefFor(g: Granularity): string {
    const next = new URLSearchParams(params?.toString() ?? '');
    next.set('granularity', g);
    return `/?${next.toString()}`;
  }

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-neutral-200 text-[11px] dark:border-neutral-800">
      <Link
        href={hrefFor('monthly')}
        scroll={false}
        prefetch={false}
        aria-pressed={active === 'monthly'}
        className={`px-2.5 py-1 font-medium transition-colors ${
          active === 'monthly'
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900'
        }`}
      >
        {monthlyLabel}
      </Link>
      <Link
        href={hrefFor('weekly')}
        scroll={false}
        prefetch={false}
        aria-pressed={active === 'weekly'}
        className={`border-l border-neutral-200 px-2.5 py-1 font-medium transition-colors dark:border-neutral-800 ${
          active === 'weekly'
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900'
        }`}
      >
        {weeklyLabel}
      </Link>
    </div>
  );
}
