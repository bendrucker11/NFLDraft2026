import { cookies } from "next/headers";

const ADMIN_COOKIE = "draft_admin_session";

export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === "1";
}

export async function setAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
