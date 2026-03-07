import type { ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

type StreamEvent = {
  type: string;
  data?: Record<string, unknown>;
};

type InternalEvent = StreamEvent & {
  id: string;
  timestamp: string;
};

const subscribers = new Set<ServerResponse>();

export function addStreamSubscriber(res: ServerResponse) {
  subscribers.add(res);
  res.write(`event: init\ndata: {}\n\n`);
  return () => {
    subscribers.delete(res);
  };
}

export function broadcastEvent(event: StreamEvent) {
  if (subscribers.size === 0) {
    return;
  }
  const message: InternalEvent = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };
  const payload = `event: ${message.type}\ndata: ${JSON.stringify(message)}\n\n`;
  for (const res of subscribers) {
    res.write(payload);
  }
}

