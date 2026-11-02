/**
 * Listens to an SSE stream in the browser. Each `eventName` message is parsed
 * as JSON and passed to `onMessage` with its id. Returns a function to close
 * the connection. (EventSource reconnects on its own if the network drops.)
 */
export function openEventStream<T>(
  url: string,
  eventName: string,
  onMessage: (data: T, id: string) => void,
): () => void {
  const source = new EventSource(url);
  source.addEventListener(eventName, (e) => {
    const { data, lastEventId } = e as MessageEvent<string>;
    onMessage(JSON.parse(data) as T, lastEventId);
  });
  return () => source.close();
}
