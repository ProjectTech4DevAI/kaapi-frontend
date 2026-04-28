"use client";

import { useEffect, useRef } from "react";
import {
  ConsecutiveBreaker,
  CircuitState,
  handleAll,
  circuitBreaker,
  BrokenCircuitError,
} from "cockatiel";

const MAX_CONSECUTIVE_FAILURES = 5;
const HALF_OPEN_AFTER_MS = 30_000;
const RECONNECT_DELAY_MS = 1_000;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useAssessmentEvents(
  apiKey: string,
  onEvent: () => void,
  enabled: boolean = true,
  onForbidden?: () => void,
) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let cancelled = false;
    const abortController = new AbortController();
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let startInFlight = false;

    const breakerPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: HALF_OPEN_AFTER_MS,
      breaker: new ConsecutiveBreaker(MAX_CONSECUTIVE_FAILURES),
    });

    const scheduleReconnect = (delayMs = RECONNECT_DELAY_MS) => {
      if (cancelled || reconnectTimeout !== null) return;
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        void start();
      }, delayMs);
    };

    breakerPolicy.onBreak(() => {
      console.error("[useAssessmentEvents] Assessment SSE circuit opened.");
    });

    breakerPolicy.onHalfOpen(() => {
      if (!cancelled) {
        void start();
      }
    });

    const connectAndStream = async (): Promise<void> => {
      let response: Response;

      try {
        const headers = new Headers();
        if (apiKey) {
          headers.set("X-API-KEY", apiKey);
        }

        response = await fetch("/api/assessment/events", {
          headers,
          cache: "no-store",
          credentials: "include",
          signal: abortController.signal,
        });
      } catch (error) {
        if (
          cancelled ||
          abortController.signal.aborted ||
          isAbortError(error)
        ) {
          return;
        }
        throw error;
      }

      if (!response.ok || !response.body) {
        if (response.status === 403 && onForbidden) {
          onForbidden();
        }
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!cancelled) {
        let chunk: ReadableStreamReadResult<Uint8Array>;

        try {
          chunk = await reader.read();
        } catch (error) {
          if (
            cancelled ||
            abortController.signal.aborted ||
            isAbortError(error)
          ) {
            return;
          }
          throw error;
        }

        const { value, done } = chunk;
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const lines = event.split("\n");
          const eventName =
            lines.find((line) => line.startsWith("event: "))?.slice(7) ?? "";
          const dataLine = lines.find((line) => line.startsWith("data: "));
          if (!dataLine || eventName === "ready") {
            continue;
          }

          const relevantEvents = [
            "assessment.child_status_changed",
            "assessment.results_preparing",
            "assessment.results_ready",
          ];

          try {
            const payload = JSON.parse(dataLine.slice(6));
            const eventType = payload?.type || payload?.data?.type || eventName;
            if (relevantEvents.includes(eventType)) {
              onEventRef.current();
            }
          } catch {
            onEventRef.current();
          }
        }
      }

      if (!cancelled) {
        throw new Error("Assessment SSE connection closed unexpectedly.");
      }
    };

    const start = async () => {
      if (cancelled || startInFlight) return;
      startInFlight = true;

      try {
        await breakerPolicy.execute(async ({ signal }) => {
          if (cancelled || signal.aborted) return;
          await connectAndStream();
        });

        if (!cancelled && breakerPolicy.state === CircuitState.Closed) {
          scheduleReconnect();
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof BrokenCircuitError) {
          console.error(
            "[useAssessmentEvents] Assessment SSE circuit open; waiting for half-open.",
          );
          return;
        }

        console.error(
          "[useAssessmentEvents] Assessment SSE connection failed.",
          err,
        );
        if (breakerPolicy.state === CircuitState.Closed) {
          scheduleReconnect();
        }
      } finally {
        startInFlight = false;
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (reconnectTimeout !== null) {
        clearTimeout(reconnectTimeout);
      }
      void reader?.cancel().catch(() => {});
      abortController.abort();
    };
  }, [apiKey, enabled, onForbidden]);
}
