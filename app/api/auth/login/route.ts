import { loginUser, setSessionCookie } from "@/app/lib/app-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const result = await loginUser(body.username, body.password);
    return setSessionCookie(Response.json({ user: result.user }), result.token);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "登录失败" }, { status: 401 });
  }
}
