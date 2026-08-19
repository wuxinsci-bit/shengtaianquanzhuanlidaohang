import { classifyPatent, ECO_DOMAINS, type PatentInput } from "@/app/lib/patents";
import { resolvePrefectureCity } from "@/app/lib/city-resolver";
import { getDatabase, patentBindings, UPSERT_PATENT_SQL } from "@/db/bootstrap";

export const dynamic = "force-dynamic";

function clean(value: unknown, max = 2000) {
  return String(value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseCsv(text: string, maxRows = 10000) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length && rows.length < maxRows + 5; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function valueOf(item: Record<string, string>, names: string[]) {
  for (const name of names) if (item[name]) return clean(item[name]);
  return "";
}

function statusFor(publicationNumber: string) {
  if (/U$/.test(publicationNumber)) return "实用新型授权文本";
  if (/[BC]$/.test(publicationNumber)) return "授权文本";
  if (/A$/.test(publicationNumber)) return "公开申请文本";
  return "公开状态待核验";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const domain = clean(form.get("domain"), 40);
    const sourceName = clean(form.get("sourceName"), 100) || "专利平台导出";
    const sourceQuery = clean(form.get("sourceQuery"), 2000);
    if (!(file instanceof File)) return Response.json({ error: "请选择 CSV 文件" }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".csv")) return Response.json({ error: "当前支持 CSV；Excel 文件请另存为 CSV 后导入" }, { status: 400 });
    if (file.size > 15_000_000) return Response.json({ error: "文件超过 15 MB，请分批导入" }, { status: 400 });
    if (!ECO_DOMAINS.some((item) => item.id === domain)) return Response.json({ error: "请选择目标生态技术类别" }, { status: 400 });

    const rows = parseCsv(await file.text());
    const headerIndex = rows.findIndex((row) => {
      const first = clean(row[0], 100).replace(/^\uFEFF/, "").toLowerCase();
      return ["id", "publication number", "公开号", "公开（公告）号", "专利号"].includes(first);
    });
    if (headerIndex < 0) return Response.json({ error: "未识别到专利号字段，请检查导出表头" }, { status: 400 });
    const headers = rows[headerIndex].map((value) => clean(value, 100).toLowerCase());
    const unique = new Map<string, PatentInput>();
    let rejected = 0;

    for (const row of rows.slice(headerIndex + 1)) {
      const item = Object.fromEntries(headers.map((header, index) => [header, clean(row[index], 12000)]));
      const publicationNumber = valueOf(item, ["id", "publication number", "公开号", "公开（公告）号", "专利号"]).replace(/[-\s]/g, "");
      const title = valueOf(item, ["title", "名称", "专利名称"]);
      const applicant = valueOf(item, ["assignee", "applicant", "申请人", "申请（专利权）人"]);
      if (!publicationNumber || !title || !applicant) { rejected += 1; continue; }
      const classification = classifyPatent(title, domain);
      if (classification.domain !== domain || classification.confidence < 0.85) { rejected += 1; continue; }
      const applicantAddress = valueOf(item, ["address", "申请人地址", "地址"]);
      const location = resolvePrefectureCity(applicantAddress, applicant);
      unique.set(publicationNumber, {
        publicationNumber,
        title,
        applicant,
        applicantAddress,
        abstract: valueOf(item, ["abstract", "摘要"]),
        filingDate: valueOf(item, ["filing/creation date", "application date", "申请日"]),
        publicationDate: valueOf(item, ["publication date", "公开日", "公开（公告）日"]),
        grantDate: valueOf(item, ["grant date", "授权日"]),
        ipc: valueOf(item, ["ipc", "分类号", "主分类号"]),
        legalStatus: statusFor(publicationNumber),
        ecoDomain: domain as PatentInput["ecoDomain"],
        ...location,
        sourceName,
        sourceUrl: valueOf(item, ["result link", "来源链接"]) || `https://patents.google.com/patent/${publicationNumber}/zh`,
        sourceQuery,
        dataQuality: `${sourceName}导出；标题专属词高置信分类；${location.city === "待解析" ? "城市待人工校正" : "城市解析需复核"}`,
        classificationConfidence: classification.confidence,
        classificationBasis: classification.basis,
      });
    }

    const records = [...unique.values()].slice(0, 2000);
    if (!records.length) return Response.json({ error: "没有通过该类别严格规则的记录", rejected }, { status: 400 });
    const database = await getDatabase();
    for (let start = 0; start < records.length; start += 50) {
      await database.batch(records.slice(start, start + 50).map((record) => database.prepare(UPSERT_PATENT_SQL).bind(...patentBindings(record))));
    }
    return Response.json({ imported: records.length, rejected, unresolved: records.filter((item) => item.city === "待解析").length });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "导入失败" }, { status: 500 });
  }
}
