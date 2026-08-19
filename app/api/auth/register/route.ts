import { registerUser, setSessionCookie } from "@/app/lib/app-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await registerUser((await request.json()) as Record<string, unknown>);
    return setSessionCookie(Response.json({ user: result.user, audit: "自动审核通过" }, { status: 201 }), result.token);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "注册失败" }, { status: 400 });
  }
}
