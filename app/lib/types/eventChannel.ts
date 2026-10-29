/** One message on an event channel; `seq` doubles as the SSE event id. */
export interface ChannelEvent<T> {
  seq: number;
  data: T;
}

export type ChannelListener<T> = (event: ChannelEvent<T>) => void;

export interface ChannelState<T> {
  events: Map<string, ChannelEvent<T>[]>;
  listeners: Map<string, Set<ChannelListener<T>>>;
  lastSeq: number;
}
