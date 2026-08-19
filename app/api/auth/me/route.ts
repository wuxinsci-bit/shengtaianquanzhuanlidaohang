import { requireApiUser } from "@/app/lib/app-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  return Response.json({ user });
}
