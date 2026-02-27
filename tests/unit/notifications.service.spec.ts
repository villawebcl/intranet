import { expect, test } from "@playwright/test";

import { markNotificationsSent } from "../../lib/notifications/service";

function createAdminNotificationsClientStub(options?: { updateError?: unknown }) {
  const calls: {
    table?: string;
    payload?: Record<string, unknown>;
    ids?: string[];
    sentAtFilter?: null;
  } = {};

  const query = {
    in: (field: string, value: string[]) => {
      if (field !== "id") {
        throw new Error(`unexpected filter field: ${field}`);
      }
      calls.ids = value;
      return query;
    },
    is: async (field: string, value: null) => {
      if (field !== "sent_at") {
        throw new Error(`unexpected sent_at field: ${field}`);
      }
      calls.sentAtFilter = value;
      return { error: options?.updateError ?? null };
    },
  };

  const adminClient = {
    from: (table: string) => {
      calls.table = table;

      return {
        update: (payload: Record<string, unknown>) => {
          calls.payload = payload;
          return query;
        },
      };
    },
  };

  return { adminClient, calls };
}

test("markNotificationsSent actualiza sent_at con cliente privilegiado y evita duplicados", async () => {
  const { adminClient, calls } = createAdminNotificationsClientStub();

  await markNotificationsSent(["n1", "n1", "n2"], { adminClient: adminClient as never });

  expect(calls.table).toBe("notifications");
  expect(calls.ids).toEqual(["n1", "n2"]);
  expect(calls.sentAtFilter).toBeNull();
  expect(calls.payload).toMatchObject({
    sent_at: expect.any(String),
  });
});
