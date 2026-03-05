import "server-only";

import { headers } from "next/headers";

type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

export async function getRequestId() {
  try {
    const headerStore = await headers();
    return headerStore.get("x-request-id") ?? null;
  } catch {
    return null;
  }
}

export async function logServerEvent(level: LogLevel, event: string, payload: LogPayload = {}) {
  const requestId = await getRequestId();
  const entry = {
    level,
    event,
    requestId,
    ts: new Date().toISOString(),
    ...payload,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(entry));
    return;
  }

  console.log(JSON.stringify(entry));
}
