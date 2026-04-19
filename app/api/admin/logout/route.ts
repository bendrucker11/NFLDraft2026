import { clearAdminSession } from "@/lib/admin-session";
import { NextResponse } from "next/server";

/**
 * Clears the httpOnly admin cookie. Used by the client on tab/window unload
 * (fetch with keepalive); must be a route handler so the browser can call it during pagehide.
 */
export async function POST() {
  await clearAdminSession();
  return new NextResponse(null, { status: 204 });
}
