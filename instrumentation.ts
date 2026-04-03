/**
 * Next.js instrumentation file — runs once on server startup.
 * Configures OpenTelemetry for server-side tracing and log export.
 * Uses the `stream-name` header to route data to named OpenObserve streams.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeTracerProvider } = await import(
      "@opentelemetry/sdk-trace-node"
    );
    const { OTLPTraceExporter } = await import(
      "@opentelemetry/exporter-trace-otlp-http"
    );
    const { OTLPLogExporter } = await import(
      "@opentelemetry/exporter-logs-otlp-http"
    );
    const sdkLogs = await import("@opentelemetry/sdk-logs");
    const { Resource } = await import("@opentelemetry/resources");
    const { ATTR_SERVICE_NAME } = await import(
      "@opentelemetry/semantic-conventions"
    );
    const { BatchSpanProcessor } = await import(
      "@opentelemetry/sdk-trace-base"
    );
    const { trace } = await import("@opentelemetry/api");
    const apiLogs = await import("@opentelemetry/api-logs");
    const { HttpInstrumentation } = await import(
      "@opentelemetry/instrumentation-http"
    );
    const { registerInstrumentations } = await import(
      "@opentelemetry/instrumentation"
    );

    const baseEndpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:5080";
    const serviceName = process.env.OTEL_SERVICE_NAME || "kaapi-frontend";
    const authHeader = process.env.OTEL_EXPORTER_OTLP_AUTH_HEADER || "";

    const otlpEndpoint = `${baseEndpoint}/api/default`;

    const headers: Record<string, string> = {
      "stream-name": serviceName,
    };
    if (authHeader) {
      headers["Authorization"] = `Basic ${authHeader}`;
    }

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
    });

    // --- Traces ---
    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers,
    });

    const tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
    });

    tracerProvider.register();
    trace.setGlobalTracerProvider(tracerProvider);

    // --- Logs ---
    const logExporter = new OTLPLogExporter({
      url: `${otlpEndpoint}/v1/logs`,
      headers,
    });

    const loggerProvider = new sdkLogs.LoggerProvider({
      resource,
      processors: [new sdkLogs.BatchLogRecordProcessor(logExporter)],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    apiLogs.logs.setGlobalLoggerProvider(loggerProvider);

    // --- Auto-instrumentation: Node.js HTTP ---
    registerInstrumentations({
      tracerProvider,
      instrumentations: [new HttpInstrumentation()],
    });

    // Bridge console.log/error/warn to OTEL log export
    const otelLogger = apiLogs.logs.getLogger(serviceName);
    // eslint-disable-next-line no-console
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    // eslint-disable-next-line no-console
    const originalInfo = console.info;

    // eslint-disable-next-line no-console
    console.log = (...args: unknown[]) => {
      originalLog.apply(console, args);
      otelLogger.emit({
        severityNumber: apiLogs.SeverityNumber.INFO,
        severityText: "INFO",
        body: args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
      });
    };

    console.error = (...args: unknown[]) => {
      originalError.apply(console, args);
      otelLogger.emit({
        severityNumber: apiLogs.SeverityNumber.ERROR,
        severityText: "ERROR",
        body: args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
      });
    };

    console.warn = (...args: unknown[]) => {
      originalWarn.apply(console, args);
      otelLogger.emit({
        severityNumber: apiLogs.SeverityNumber.WARN,
        severityText: "WARN",
        body: args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
      });
    };

    // eslint-disable-next-line no-console
    console.info = (...args: unknown[]) => {
      originalInfo.apply(console, args);
      otelLogger.emit({
        severityNumber: apiLogs.SeverityNumber.INFO,
        severityText: "INFO",
        body: args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "),
      });
    };

    originalInfo.call(
      console,
      `[instrumentation] OpenTelemetry initialized, stream: ${serviceName}`
    );
  }
}
