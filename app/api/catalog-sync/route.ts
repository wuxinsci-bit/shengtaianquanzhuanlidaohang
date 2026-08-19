import { syncPatentCorpusChunk } from "@/db/bootstrap";
import { requireApiUser } from "@/app/lib/app-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!await requireApiUser(request)) return Response.json({ error: "请先登录" }, { status: 401 });
    return Response.json(await syncPatentCorpusChunk());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "专利目录同步失败" },
      { status: 500 },
    );
  }
}
