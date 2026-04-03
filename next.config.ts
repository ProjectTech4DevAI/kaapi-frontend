import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/exporter-trace-otlp-http",
    "@opentelemetry/exporter-logs-otlp-http",
    "@opentelemetry/sdk-logs",
    "@opentelemetry/instrumentation-http",
    "@opentelemetry/instrumentation",
  ],
};

export default nextConfig;
