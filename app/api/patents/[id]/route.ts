import { getDatabase, patentBindings, PATENT_COLUMNS } from "@/db/bootstrap";
import { validateInput } from "../route";
import type { PatentRecord } from "@/app/lib/patents";
import { requireApiUser } from "@/app/lib/app-auth";

export const dynamic = "force-dynamic";

async function patentId(params: Promise<{ id: string }>) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) throw new Error("无效的专利记录编号");
  return id;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!await requireApiUser(request)) return Response.json({ error: "请先登录" }, { status: 401 });
    const id = await patentId(context.params);
    const patent = validateInput((await request.json()) as Record<string, unknown>);
    const values = patentBindings(patent);
    const database = await getDatabase();
    const result = await database.prepare(`UPDATE patents SET
      publication_number=?, title=?, applicant=?, applicant_address=?, abstract=?,
      filing_date=?, publication_date=?, grant_date=?, ipc=?, legal_status=?, eco_domain=?,
      province=?, city=?, city_adcode=?, latitude=?, longitude=?, location_source=?,
      location_confidence=?, source_name=?, source_url=?, source_query=?, data_quality=?,
      classification_confidence=?, classification_basis=?,
      updated_at=CURRENT_TIMESTAMP
      WHERE id=? RETURNING ${PATENT_COLUMNS}`).bind(...values, id).first<PatentRecord>();
    if (!result) return Response.json({ error: "未找到该专利记录" }, { status: 404 });
    return Response.json({ patent: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新专利失败";
    return Response.json({ error: /UNIQUE|unique/.test(message) ? "该专利号已存在" : message }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!await requireApiUser(_)) return Response.json({ error: "请先登录" }, { status: 401 });
    const id = await patentId(context.params);
    const database = await getDatabase();
    const result = await database.prepare("DELETE FROM patents WHERE id=? RETURNING id").bind(id).first<{ id: number }>();
    if (!result) return Response.json({ error: "未找到该专利记录" }, { status: 404 });
    return Response.json({ deleted: result.id });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "删除专利失败" }, { status: 400 });
  }
}
