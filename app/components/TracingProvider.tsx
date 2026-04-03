"use client";

import { useEffect } from "react";

export function TracingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_OTEL_ENABLED === "true") {
      import("@/app/lib/tracing").then(({ initBrowserTracing }) => {
        initBrowserTracing();
      });
    }
  }, []);

  return <>{children}</>;
}
