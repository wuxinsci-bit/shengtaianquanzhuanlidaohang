import { clearSessionCookie, logoutUser, sessionTokenFromRequest } from "@/app/lib/app-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await logoutUser(sessionTokenFromRequest(request));
  return clearSessionCookie(Response.json({ ok: true }));
}
