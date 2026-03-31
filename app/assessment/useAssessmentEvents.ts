"use client";

import { useEffect, useRef } from 'react';

export function useAssessmentEvents(
  apiKey: string,
  onEvent: () => void,
) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!apiKey) return;

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleReconnect = () => {
      if (cancelled) return;
      reconnectTimer = setTimeout(() => {
        void connect();
      }, 1000);
    };

    const connect = async () => {
      try {
        const response = await fetch('/api/assessment/events', {
          headers: { 'X-API-KEY': apiKey },
          cache: 'no-store',
        });
        if (!response.ok || !response.body) return;

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            const lines = event.split('\n');
            const eventName = lines.find(line => line.startsWith('event: '))?.slice(7) ?? '';
            const dataLine = lines.find(line => line.startsWith('data: '));
            if (!dataLine || eventName === 'ready') {
              continue;
            }

            // Respond to all assessment event types
            const relevantEvents = [
              'assessment.child_status_changed',
              'assessment.results_preparing',
              'assessment.results_ready',
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
      } catch {
        // Ignore transient network failures; the hook reconnects automatically.
      } finally {
        if (!cancelled) {
          scheduleReconnect();
        }
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      void reader?.cancel();
    };
  }, [apiKey]);
}
