'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export type CockpitTab = 'forecast' | 'playbook';

interface Props {
  active: CockpitTab;
  forecastLabel: string;
  playbookLabel: string;
}

/**
 * Primary navigation between the two cockpit views — Forecast (KPI +
 * chart + model inputs) and Playbook (matrix + simulator). State lives
 * in `?tab=` so it's shareable, server-readable, and preserves every
 * other param on click.
 */
export default function CockpitTabs({ active, forecastLabel, playbookLabel }: Props) {
  const params = useSearchParams();

  function hrefFor(t: CockpitTab): string {
    const next = new URLSearchParams(params?.toString() ?? '');
    next.set('tab', t);
    return `/?${next.toString()}`;
  }

  const base =
    'px-5 py-2.5 font-display text-sm font-semibold tracking-[0.08em] uppercase transition-colors';
  const activeCls =
    'bg-charcoal text-cream dark:bg-neutral-100 dark:text-neutral-900';
  const inactiveCls =
    'bg-white text-neutral-500 hover:bg-neutral-50 hover:text-charcoal dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100';

  return (
    <nav
      role="tablist"
      aria-label="Cockpit sections"
      className="flex w-fit shrink-0 items-stretch self-start overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800"
    >
      <Link
        href={hrefFor('forecast')}
        scroll={false}
        prefetch={false}
        role="tab"
        aria-selected={active === 'forecast'}
        className={`${base} ${active === 'forecast' ? activeCls : inactiveCls}`}
      >
        {forecastLabel}
      </Link>
      <Link
        href={hrefFor('playbook')}
        scroll={false}
        prefetch={false}
        role="tab"
        aria-selected={active === 'playbook'}
        className={`${base} border-l border-neutral-200 dark:border-neutral-800 ${
          active === 'playbook' ? activeCls : inactiveCls
        }`}
      >
        {playbookLabel}
      </Link>
    </nav>
  );
}
