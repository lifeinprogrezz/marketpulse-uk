'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { messagesFor, type Lang } from '@/app/lib/i18n';

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1.5 last:mb-0">{children}</ol>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-2.5 mt-5 text-base font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-5 text-sm font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-1.5 mt-4 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {children}
    </a>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs dark:bg-neutral-800">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-3 overflow-x-auto rounded bg-neutral-100 p-3 font-mono text-xs last:mb-0 dark:bg-neutral-800">
      {children}
    </pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-3 border-l-2 border-neutral-300 pl-3 italic text-neutral-600 last:mb-0 dark:border-neutral-700 dark:text-neutral-400">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-neutral-300 bg-neutral-50 px-2 py-1 text-left font-semibold dark:border-neutral-700 dark:bg-neutral-800">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-neutral-300 px-2 py-1 dark:border-neutral-700">
      {children}
    </td>
  ),
};

type DynamicToolPart = {
  type: 'dynamic-tool';
  toolName: string;
  toolCallId: string;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error';
  errorText?: string;
};

function ToolCallChip({ part }: { part: DynamicToolPart }) {
  const isRunning =
    part.state === 'input-streaming' || part.state === 'input-available';
  const isError = part.state === 'output-error';

  const indicator = isError ? '✗' : isRunning ? '⋯' : '✓';
  const tone = isError
    ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
    : isRunning
    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
    : 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300';

  return (
    <div
      className={`mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-xs ${tone}`}
    >
      <span aria-hidden>{indicator}</span>
      <span>{part.toolName}</span>
      {isError && part.errorText ? (
        <span className="ml-1 text-[10px] opacity-70">{part.errorText}</span>
      ) : null}
    </div>
  );
}

export default function AiAnalystPanel({ lang }: { lang: Lang }) {
  const t = messagesFor(lang).ai;
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error, clearError, setMessages, stop } =
    useChat({
      transport: new DefaultChatTransport({ api: '/api/chat' }),
    });

  const isStreaming = status === 'streaming' || status === 'submitted';

  // Listen for handoffs from the Simulator. The simulator dispatches a
  // CustomEvent with the bundled scenario context as a plain-text prompt;
  // we push it straight into the chat so the user can see the scenario,
  // and the AI Analyst can compose a contextual answer.
  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<string>;
      if (typeof ce.detail !== 'string' || !ce.detail.trim()) return;
      if (isStreaming) return; // don't interrupt an in-flight stream
      sendMessage({ text: ce.detail });
      setInput('');
      // Scroll the chat into view if the rail is off-screen on small
      // viewports (rail stacks under the dashboard below `lg:`).
      const aside = document.querySelector('aside');
      aside?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    window.addEventListener('marketpulse:simulator-handoff', handler);
    return () => {
      window.removeEventListener('marketpulse:simulator-handoff', handler);
    };
  }, [isStreaming, sendMessage]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    sendMessage({ text });
    setInput('');
  }

  function handleNewChat() {
    if (isStreaming) stop();
    setMessages([]);
    clearError();
    setInput('');
  }

  return (
    <div className="flex h-full flex-col bg-white px-4 py-4 dark:bg-neutral-950">
      <header className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-base tracking-[0.12em] text-charcoal uppercase dark:text-neutral-100">
              {t.name}
            </h2>
            <span className="text-[10px] font-medium tracking-wide text-neutral-400 dark:text-neutral-500">
              {t.poweredBy}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={messages.length === 0 && !error}
          title={t.newChat}
          aria-label={t.newChat}
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-neutral-500 transition hover:text-charcoal disabled:opacity-30 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <span aria-hidden>↻</span>
          {t.newChat}
        </button>
      </header>

      <section className="flex-1 space-y-3 overflow-y-auto py-4">
        {/* Empty state intentionally blank — subtitle already explains
            scope, and stale example prompts add visual noise. */}

        {messages.map((m) => (
          <article
            key={m.id}
            className="rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {m.role === 'assistant' ? t.rolePillAssistant : t.rolePillUser}
            </div>
            <div className="leading-relaxed">
              {m.parts.map((part, i) => {
                if (part.type === 'text') {
                  return (
                    <ReactMarkdown
                      key={`${m.id}-${i}`}
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {part.text}
                    </ReactMarkdown>
                  );
                }
                if (part.type === 'dynamic-tool') {
                  return (
                    <ToolCallChip
                      key={`${m.id}-${i}`}
                      part={part as DynamicToolPart}
                    />
                  );
                }
                return null;
              })}
            </div>
          </article>
        ))}
      </section>

      {error ? (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          <div>
            <strong className="font-semibold">{t.errorHeading}</strong>{' '}
            <span className="opacity-80">{error.message}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="shrink-0 rounded px-2 py-0.5 text-[10px] hover:bg-red-100 dark:hover:bg-red-900"
            aria-label={t.dismissError}
          >
            ✕
          </button>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.askPlaceholder}
          disabled={isStreaming}
          className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs shadow-sm outline-none focus:border-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {isStreaming ? t.sending : t.send}
        </button>
      </form>
    </div>
  );
}
