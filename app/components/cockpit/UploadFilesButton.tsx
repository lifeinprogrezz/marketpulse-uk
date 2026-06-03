'use client';

import { useRef } from 'react';
import { messagesFor, type Lang } from '@/app/lib/i18n';

interface UploadFilesButtonProps {
  lang: Lang;
}

export default function UploadFilesButton({ lang }: UploadFilesButtonProps) {
  const t = messagesFor(lang);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.target.value = '';
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={t.upload.demoTooltip}
        aria-label={`${t.upload.button} — ${t.upload.demoTooltip}`}
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-normal text-charcoal shadow-warm transition hover:bg-cream/60 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
      >
        <ExcelIcon />
        {t.upload.button}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}

function ExcelIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2.5" fill="#1D6F42" />
      <path
        d="M8.2 8.5L11.2 12L8.2 15.5H10.4L12.3 13.2L14.2 15.5H16.4L13.4 12L16.4 8.5H14.2L12.3 10.8L10.4 8.5H8.2Z"
        fill="white"
      />
    </svg>
  );
}
