'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export type VolumeUnit = 'Hl' | 'L';

interface Props {
  activeUnit: VolumeUnit;
  hectolitersLabel: string;
  litersLabel: string;
}

/**
 * Header-row segmented control to switch the whole dashboard between
 * Hectoliters (the Damm/industry-native unit) and Liters (more familiar
 * to non-industry readers). State lives in the `?unit=` URL search
 * param so it survives reload and is shareable; the page reads it
 * server-side and converts every Hl-denominated value before render.
 *
 * Preserves all other query params (granularity, etc.) when toggling.
 */
export default function UnitToggle({ activeUnit, hectolitersLabel, litersLabel }: Props) {
  const params = useSearchParams();

  function hrefFor(unit: VolumeUnit): string {
    const next = new URLSearchParams(params?.toString() ?? '');
    next.set('unit', unit);
    return `/?${next.toString()}`;
  }

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-neutral-200 text-xs dark:border-neutral-800">
      <Link
        href={hrefFor('Hl')}
        scroll={false}
        prefetch={false}
        aria-pressed={activeUnit === 'Hl'}
        className={`px-3 py-1.5 font-medium transition-colors ${
          activeUnit === 'Hl'
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900'
        }`}
      >
        {hectolitersLabel}
      </Link>
      <Link
        href={hrefFor('L')}
        scroll={false}
        prefetch={false}
        aria-pressed={activeUnit === 'L'}
        className={`border-l border-neutral-200 px-3 py-1.5 font-medium transition-colors dark:border-neutral-800 ${
          activeUnit === 'L'
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
            : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900'
        }`}
      >
        {litersLabel}
      </Link>
    </div>
  );
}
