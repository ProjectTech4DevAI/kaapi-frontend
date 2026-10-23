import type {
  ChatbotSessionEvent,
  ChatbotSessionEventListener,
  ChatbotSessionStoreShape,
} from "@/app/lib/types/chatbot";

const globalKey = Symbol.for("kaapi.chatbotSessionStore");

type WithStore = { [globalKey]?: ChatbotSessionStoreShape };
const g = globalThis as unknown as WithStore;

if (!g[globalKey]) {
  g[globalKey] = { events: new Map(), listeners: new Map(), lastSeq: 0 };
}

const store = g[globalKey]!;

const MAX_EVENTS_PER_SESSION = 50;
const MAX_SESSIONS = 500;
const TTL_MS = 30 * 60 * 1000;

function nextSeq(): number {
  store.lastSeq = Math.max(Date.now(), store.lastSeq + 1);
  return store.lastSeq;
}

function prune(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [sessionId, events] of store.events.entries()) {
    const last = events[events.length - 1];
    if (!last || last.seq < cutoff) store.events.delete(sessionId);
  }
  // Map keeps insertion order, so the first keys are the oldest sessions.
  for (const sessionId of store.events.keys()) {
    if (store.events.size <= MAX_SESSIONS) break;
    store.events.delete(sessionId);
  }
}

function emit(event: ChatbotSessionEvent): void {
  const set = store.listeners.get(event.sessionId);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(event);
    } catch (e) {
      console.error("chatbot session listener error:", e);
    }
  }
}

export function saveSessionEvent(
  event: Omit<ChatbotSessionEvent, "seq">,
): ChatbotSessionEvent {
  const saved: ChatbotSessionEvent = { ...event, seq: nextSeq() };
  const events = store.events.get(event.sessionId) ?? [];
  events.push(saved);
  if (events.length > MAX_EVENTS_PER_SESSION) events.shift();
  store.events.set(event.sessionId, events);
  prune();
  emit(saved);
  return saved;
}

/** Seq of the newest buffered event for a session (0 when none). */
export function getLatestSessionSeq(sessionId: string): number {
  const events = store.events.get(sessionId);
  return events?.[events.length - 1]?.seq ?? 0;
}

/** Events newer than `afterSeq`, oldest first. */
export function getSessionEventsAfter(
  sessionId: string,
  afterSeq: number,
): ChatbotSessionEvent[] {
  return (store.events.get(sessionId) ?? []).filter((e) => e.seq > afterSeq);
}

export function subscribeSessionEvents(
  sessionId: string,
  cb: ChatbotSessionEventListener,
): () => void {
  let set = store.listeners.get(sessionId);
  if (!set) {
    set = new Set();
    store.listeners.set(sessionId, set);
  }
  set.add(cb);
  return () => {
    const s = store.listeners.get(sessionId);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) store.listeners.delete(sessionId);
  };
}
