import { syncPatentCorpusChunk } from "@/db/bootstrap";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return Response.json(await syncPatentCorpusChunk());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "专利目录同步失败" },
      { status: 500 },
    );
  }
}
