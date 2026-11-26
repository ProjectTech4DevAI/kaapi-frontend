import type {
  ChannelEvent,
  ChannelListener,
  ChannelState,
} from "@/app/lib/types/eventChannel";

const TTL_MS = 30 * 60 * 1000;

/**
 * In-memory pub/sub on the server: the webhook route `publish`es under a key
 * (e.g. session id), the SSE route `subscribe`s to it. The last few events per
 * key are kept so a reconnecting browser can catch up with `after`.
 */
export function createEventChannel<T>(name: string, maxEventsPerKey = 50) {
  const globalKey = Symbol.for(`kaapi.eventChannel.${name}`);
  const g = globalThis as unknown as Record<symbol, ChannelState<T>>;
  g[globalKey] ??= { events: new Map(), listeners: new Map(), lastSeq: 0 };
  const state = g[globalKey];

  function dropOldKeys() {
    const cutoff = Date.now() - TTL_MS;
    for (const [key, events] of state.events) {
      if (events[events.length - 1].seq < cutoff) state.events.delete(key);
    }
  }

  function publish(key: string, data: T): void {
    state.lastSeq = Math.max(Date.now(), state.lastSeq + 1);
    const event: ChannelEvent<T> = { seq: state.lastSeq, data };

    const events = [...(state.events.get(key) ?? []), event];
    state.events.set(key, events.slice(-maxEventsPerKey));
    dropOldKeys();

    state.listeners.get(key)?.forEach((listener) => listener(event));
  }

  function after(key: string, seq: number): ChannelEvent<T>[] {
    return (state.events.get(key) ?? []).filter((e) => e.seq > seq);
  }

  function subscribe(key: string, listener: ChannelListener<T>): () => void {
    if (!state.listeners.has(key)) state.listeners.set(key, new Set());
    state.listeners.get(key)!.add(listener);

    return () => {
      const listeners = state.listeners.get(key);
      listeners?.delete(listener);
      if (listeners?.size === 0) state.listeners.delete(key);
    };
  }

  return { publish, after, subscribe };
}
