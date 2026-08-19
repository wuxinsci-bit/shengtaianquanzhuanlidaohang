import { getDatabase, PATENT_COLUMNS } from "@/db/bootstrap";
import { classifyPatent, type PatentRecord } from "@/app/lib/patents";
import { resolvePrefectureCity } from "@/app/lib/city-resolver";
import { requireApiUser } from "@/app/lib/app-auth";

export const dynamic = "force-dynamic";

function parseCsv(text: string, maxRows: number) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
      if (rows.length >= maxRows + 2) break;
    } else {
      cell += char;
    }
  }
  if ((cell || row.length) && rows.length < maxRows + 2) { row.push(cell); rows.push(row); }
  return rows;
}

export async function POST(request: Request) {
  if (!await requireApiUser(request)) return Response.json({ error: "请先登录" }, { status: 401 });
  const database = await getDatabase();
  let jobId: number | null = null;
  try {
    const body = (await request.json()) as { query?: string; domain?: string; maxResults?: number };
    const query = String(body.query ?? "").trim().slice(0, 120);
    const domain = String(body.domain ?? "").trim();
    const maxResults = Math.min(Math.max(Number(body.maxResults) || 20, 1), 50);
    if (query.length < 2) return Response.json({ error: "检索词至少需要2个字符" }, { status: 400 });

    const latest = await database.prepare("SELECT started_at AS startedAt FROM collection_jobs ORDER BY id DESC LIMIT 1").first<{ startedAt: string }>();
    if (latest && Date.now() - new Date(`${latest.startedAt.replace(" ", "T")}Z`).getTime() < 60_000) {
      return Response.json({ error: "为保护公开数据源，请在1分钟后再发起采集" }, { status: 429 });
    }

    const job = await database.prepare("INSERT INTO collection_jobs(source_name, query_text, status) VALUES('Google Patents', ?, 'running') RETURNING id").bind(query).first<{ id: number }>();
    jobId = job?.id ?? null;

    const searchExpression = `q=(${query})&country=CN&language=CHINESE`;
    const downloadUrl = `https://patents.google.com/xhr/query?url=${encodeURIComponent(searchExpression)}&exp=&download=true`;
    const response = await fetch(downloadUrl, { headers: { "User-Agent": "EcoPatentNavigator/0.1 educational research prototype" } });
    if (!response.ok) throw new Error(`公开数据源返回 ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 15_000_000) throw new Error("结果集过大，请缩小检索范围");
    const csv = await response.text();
    if (csv.length > 15_000_000) throw new Error("结果集过大，请缩小检索范围");

    const rows = parseCsv(csv, maxResults * 12);
    const headerIndex = rows.findIndex((row) => row[0]?.trim().toLowerCase() === "id");
    if (headerIndex < 0) throw new Error("公开数据格式发生变化，未找到字段行");
    const headers = rows[headerIndex].map((value) => value.trim().toLowerCase());
    const records = rows.slice(headerIndex + 1);
    let imported = 0;
    let unresolved = 0;
    let rejected = 0;

    for (const row of records) {
      if (imported >= maxResults) break;
      const item = Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()]));
      const publicationNumber = (item.id || "").replace(/-/g, "");
      const title = (item.title || "").trim();
      const applicant = (item.assignee || "").trim();
      if (!publicationNumber || !title || !applicant) continue;
      const location = resolvePrefectureCity("", applicant);
      const classification = classifyPatent(title, domain);
      if (!classification.domain) { rejected += 1; continue; }
      if (location.city === "待解析") unresolved += 1;

      await database.prepare(`INSERT INTO patents (
        publication_number, title, applicant, filing_date, publication_date, grant_date,
        eco_domain, province, city, city_adcode, latitude, longitude, location_source,
        location_confidence, source_name, source_url, source_query, legal_status, data_quality,
        classification_confidence, classification_basis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Google Patents', ?, ?, '公开状态待核验', ?, ?, ?)
      ON CONFLICT(publication_number) DO UPDATE SET
        title=excluded.title,
        applicant=excluded.applicant,
        filing_date=excluded.filing_date,
        publication_date=excluded.publication_date,
        grant_date=excluded.grant_date,
        eco_domain=excluded.eco_domain,
        classification_confidence=excluded.classification_confidence,
        classification_basis=excluded.classification_basis,
        source_url=excluded.source_url,
        source_query=excluded.source_query,
        city=CASE WHEN patents.location_confidence < excluded.location_confidence THEN excluded.city ELSE patents.city END,
        province=CASE WHEN patents.location_confidence < excluded.location_confidence THEN excluded.province ELSE patents.province END,
        city_adcode=CASE WHEN patents.location_confidence < excluded.location_confidence THEN excluded.city_adcode ELSE patents.city_adcode END,
        latitude=CASE WHEN patents.location_confidence < excluded.location_confidence THEN excluded.latitude ELSE patents.latitude END,
        longitude=CASE WHEN patents.location_confidence < excluded.location_confidence THEN excluded.longitude ELSE patents.longitude END,
        location_source=CASE WHEN patents.location_confidence < excluded.location_confidence THEN excluded.location_source ELSE patents.location_source END,
        location_confidence=MAX(patents.location_confidence, excluded.location_confidence),
        updated_at=CURRENT_TIMESTAMP`).bind(
          publicationNumber, title, applicant, item["filing/creation date"] || "",
          item["publication date"] || "", item["grant date"] || "", classification.domain,
          location.province, location.city, location.cityAdcode, location.latitude,
          location.longitude, location.locationSource, location.locationConfidence,
          item["result link"] || `https://patents.google.com/patent/${publicationNumber}/zh`,
          query, location.city === "待解析" ? "公开导出；标题级对象优先分类；城市待人工校正" : "公开导出；标题级对象优先分类；城市由机构名称规则推断，需人工复核",
          classification.confidence, classification.basis,
        ).run();
      imported += 1;
    }

    if (jobId) await database.prepare("UPDATE collection_jobs SET status='completed', imported_count=?, unresolved_count=?, finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(imported, unresolved, jobId).run();
    const latestRows = await database.prepare(`SELECT ${PATENT_COLUMNS} FROM patents ORDER BY updated_at DESC, id DESC LIMIT ?`).bind(Math.max(imported, 1)).all<PatentRecord>();
    return Response.json({ imported, unresolved, rejected, patents: latestRows.results, sourceUrl: `https://patents.google.com/?${searchExpression}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "采集失败";
    if (jobId) await database.prepare("UPDATE collection_jobs SET status='failed', message=?, finished_at=CURRENT_TIMESTAMP WHERE id=?").bind(message.slice(0, 500), jobId).run();
    return Response.json({ error: message }, { status: 502 });
  }
}
