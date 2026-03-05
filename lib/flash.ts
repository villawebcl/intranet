import "server-only";

import { cookies } from "next/headers";

const FLASH_COOKIE = "__flash";
const FLASH_MAX_AGE_SECONDS = 60;

export type FlashData = { success?: string; error?: string };

export async function setFlash(data: FlashData): Promise<void> {
  const store = await cookies();
  store.set(FLASH_COOKIE, JSON.stringify(data), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: FLASH_MAX_AGE_SECONDS,
  });
}

export async function getFlash(): Promise<FlashData> {
  const store = await cookies();
  const raw = store.get(FLASH_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as FlashData;
  } catch {
    return {};
  }
}
