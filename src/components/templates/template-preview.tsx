"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface TemplatePreviewProps {
  header?: {
    type?: string;
    text?: string;
    imageUrl?: string;
  } | null;
  body?: {
    text?: string;
  } | null;
  footer?: string | null;
  buttons?: Array<{
    type: string;
    text?: string;
    url?: string;
    phone_number?: string;
  }> | null;
  variables?: Record<string, string>;
  className?: string;
}

function renderBodyWithVariables(
  text: string,
  variables?: Record<string, string>
) {
  const parts = text.split(/(\{\{\d+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/\{\{(\d+)\}\}/);
    if (match) {
      const varNum = match[1];
      const value = variables?.[varNum] || `[${varNum}]`;
      return (
        <span
          key={i}
          className="rounded bg-emerald-100 px-0.5 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
        >
          {value}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function TemplatePreview({
  header,
  body,
  footer,
  buttons,
  variables,
  className,
}: TemplatePreviewProps) {
  const bodyText = body?.text || "Your template body will appear here.";
  const headerText = header?.text;
  const headerType = header?.type || "text";

  return (
    <div className={cn("mx-auto w-full max-w-[320px]", className)}>
      <div className="relative rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-zinc-800">
          {headerType === "text" && headerText && (
            <p className="mb-2 text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
              {renderBodyWithVariables(headerText, variables)}
            </p>
          )}
          {headerType === "image" && (
            <div className="mb-2 flex h-40 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
              {header?.imageUrl ? (
                <Image
                  src={header.imageUrl}
                  alt="Header"
                  width={400}
                  height={160}
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <svg
                  className="h-8 w-8 text-zinc-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z"
                  />
                </svg>
              )}
            </div>
          )}
          {headerType === "video" && (
            <div className="mb-2 flex h-40 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-700">
              <svg
                className="h-10 w-10 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                />
              </svg>
            </div>
          )}
          {headerType === "document" && (
            <div className="mb-2 flex h-16 items-center gap-3 rounded-lg bg-zinc-100 px-3 dark:bg-zinc-700">
              <svg
                className="h-8 w-8 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                Document
              </span>
            </div>
          )}

          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            {renderBodyWithVariables(bodyText, variables)}
          </p>

          {footer && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {footer}
            </p>
          )}

          {buttons && buttons.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-700">
              {buttons.map((btn, i) => (
                <div
                  key={i}
                  className="rounded-md border border-emerald-600/30 bg-emerald-50 px-3 py-1.5 text-center text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                >
                  {btn.text || "Button"}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
