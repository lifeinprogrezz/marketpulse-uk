import type { ReactNode } from 'react';
import AiAnalystPanel from '../chat/AiAnalystPanel';
import CockpitTabs, { type CockpitTab } from './CockpitTabs';
import LangToggle from './LangToggle';
import UnitToggle, { type VolumeUnit } from './UnitToggle';
import UploadFilesButton from './UploadFilesButton';
import type { Lang } from '@/app/lib/i18n';
import { messagesFor } from '@/app/lib/i18n';

interface ShellProps {
  /** Last closed month label, e.g. "April 2026" — shown in the data-status chip. */
  monthLabel: string;
  unit: VolumeUnit;
  lang: Lang;
  tab: CockpitTab;
  kpi: ReactNode;
  forecast: ReactNode;
  inputs: ReactNode;
  matrix: ReactNode;
  simulator: ReactNode;
}

export default function Shell({
  monthLabel,
  unit,
  lang,
  tab,
  kpi,
  forecast,
  inputs,
  matrix,
  simulator,
}: ShellProps) {
  const t = messagesFor(lang);
  return (
    <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[1fr_480px]">
      <main className="flex flex-col gap-6 overflow-y-auto bg-cream p-6 dark:bg-neutral-900">
        <header className="flex flex-col gap-4">
          <h1 className="font-display text-sm tracking-[0.18em] text-charcoal uppercase dark:text-neutral-300">
            MarketPulse UK
          </h1>

          <div className="flex items-start justify-between gap-4">
            <h2 className="max-w-[44ch] text-balance text-3xl font-semibold leading-tight tracking-tight text-charcoal dark:text-neutral-100">
              {t.header.tagline}
            </h2>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {t.header.dataThrough(monthLabel)}
              </span>
              <UploadFilesButton lang={lang} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <span>{t.header.showVolumesIn}</span>
              <UnitToggle
                activeUnit={unit}
                hectolitersLabel={t.unitToggle.hectoliters}
                litersLabel={t.unitToggle.liters}
              />
            </div>
            <div className="flex items-center gap-2">
              <span>{t.header.showLanguageIn}</span>
              <LangToggle
                active={lang}
                englishLabel={t.langToggle.english}
                spanishLabel={t.langToggle.spanish}
              />
            </div>
          </div>
        </header>

        <CockpitTabs
          active={tab}
          forecastLabel={t.tabs.forecast}
          playbookLabel={t.tabs.playbook}
        />

        {tab === 'forecast' ? (
          <>
            {kpi}
            {forecast}
            {inputs}
          </>
        ) : (
          <>
            {matrix}
            {simulator}
          </>
        )}
      </main>

      <aside className="h-[60vh] border-t border-neutral-200 lg:h-auto lg:border-l lg:border-t-0 dark:border-neutral-800">
        <AiAnalystPanel lang={lang} />
      </aside>
    </div>
  );
}
