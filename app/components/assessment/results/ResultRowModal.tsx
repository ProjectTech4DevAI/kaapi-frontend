"use client";

import { Modal } from "@/app/components/ui";
import { readResultRow, resultRowTitle } from "@/app/lib/assessment/resultRow";
import type { ResultRowModalProps } from "@/app/lib/types/assessment";

const eyebrow =
  "mb-2 text-[11px] font-semibold tracking-wider uppercase text-text-secondary";

/** One submission's full assessment: scores with reasons, then the long text. */
export default function ResultRowModal({ row, onClose }: ResultRowModalProps) {
  if (!row) return null;

  const detail = readResultRow(row);
  const subtitle = detail.meta
    .slice(0, 4)
    .map((field) => field.value)
    .join(" · ");

  return (
    <Modal
      open
      onClose={onClose}
      title={resultRowTitle(row)}
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-5 px-6 py-4">
        {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}

        {detail.scores.length > 0 && (
          <section>
            <p className={eyebrow}>Scores</p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {detail.scores.map((score) => (
                <div
                  key={score.metric}
                  className="rounded-xl border border-border bg-bg-secondary p-3"
                >
                  <p className="text-[11px] font-semibold tracking-wide uppercase text-text-secondary">
                    {score.metric}
                  </p>
                  <p className="mt-0.5 text-[22px] font-bold text-text-primary tabular-nums">
                    {score.score}
                    <span className="ml-1 text-xs font-medium text-text-secondary">
                      / 10
                    </span>
                  </p>
                  {score.reason && (
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      {score.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {detail.longText.map((field) => (
          <section key={field.label}>
            <p className={eyebrow}>{field.label}</p>
            <p className="rounded-xl border border-border bg-bg-primary px-4 py-3 text-[13px] leading-7 whitespace-pre-wrap text-text-primary">
              {field.value}
            </p>
          </section>
        ))}

        {detail.documents.length > 0 && (
          <section>
            <p className={eyebrow}>Attachments</p>
            <ul className="flex flex-col gap-1">
              {detail.documents.map((href) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[11px] break-all text-accent-primary hover:underline"
                  >
                    {href}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
