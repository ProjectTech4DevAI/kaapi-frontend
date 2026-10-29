import { Fragment } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@/app/components/icons";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  muted?: boolean;
}

export default function ChatbotBreadcrumb({
  items,
}: {
  items: BreadcrumbItem[];
}) {
  const trail: BreadcrumbItem[] = [
    { label: "Chatbots", href: "/chatbot" },
    ...items,
  ];
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 min-w-0 text-sm"
    >
      {trail.map((item, i) => (
        <Fragment key={`${item.label}-${i}`}>
          {i > 0 && (
            <ChevronRightIcon className="w-3.5 h-3.5 text-text-secondary shrink-0" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="font-semibold text-text-primary hover:text-accent-primary truncate"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={
                item.muted
                  ? "text-text-secondary truncate font-mono text-xs"
                  : "font-medium text-text-primary truncate"
              }
            >
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
