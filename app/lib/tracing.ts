"use client";

/**
 * Browser-side OpenTelemetry setup.
 * Instruments fetch calls and propagates W3C traceparent headers to the backend.
 * Import and call `initBrowserTracing()` once from a root layout/provider.
 */
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { registerInstrumentations } from "@opentelemetry/instrumentation";

let initialized = false;

export function initBrowserTracing() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const endpoint =
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://localhost:5080/api/default";
  const authHeader =
    process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_AUTH_HEADER || "";

  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["Authorization"] = `Basic ${authHeader}`;
  }

  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers,
  });

  const provider = new WebTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]:
        process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || "kaapi-frontend-browser",
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        // Propagate trace context to same-origin API calls
        propagateTraceHeaderCorsUrls: [/^\/api\//, /localhost/],
      }),
    ],
  });
}
