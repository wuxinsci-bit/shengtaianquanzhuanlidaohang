import { getDatabase, INSERT_PATENT_SQL, patentBindings, PATENT_COLUMNS } from "@/db/bootstrap";
import { ECO_DOMAINS, type PatentInput, type PatentRecord } from "@/app/lib/patents";
import { resolvePrefectureCity } from "@/app/lib/city-resolver";

export const dynamic = "force-dynamic";

function clean(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function nullableNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validateInput(payload: Record<string, unknown>): PatentInput {
  const publicationNumber = clean(payload.publicationNumber, 80).replace(/\s+/g, "");
  const title = clean(payload.title, 600);
  const applicant = clean(payload.applicant, 500);
  if (!publicationNumber || !title || !applicant) throw new Error("专利号、名称和申请人不能为空");

  const applicantAddress = clean(payload.applicantAddress, 1000);
  const resolved = resolvePrefectureCity(applicantAddress, applicant);
  const requestedDomain = clean(payload.ecoDomain, 40);
  const ecoDomain = ECO_DOMAINS.some((item) => item.id === requestedDomain) ? requestedDomain : "monitoring";
  const manualCity = clean(payload.city, 100);
  const manualLatitude = nullableNumber(payload.latitude);
  const manualLongitude = nullableNumber(payload.longitude);
  const hasManualLocation = manualCity && manualCity !== "待解析" && manualLatitude !== null && manualLongitude !== null;

  return {
    publicationNumber,
    title,
    applicant,
    applicantAddress,
    abstract: clean(payload.abstract, 12000),
    filingDate: clean(payload.filingDate, 20),
    publicationDate: clean(payload.publicationDate, 20),
    grantDate: clean(payload.grantDate, 20),
    ipc: clean(payload.ipc, 300),
    legalStatus: clean(payload.legalStatus, 100),
    ecoDomain: ecoDomain as PatentInput["ecoDomain"],
    province: hasManualLocation ? clean(payload.province, 100) : resolved.province,
    city: hasManualLocation ? manualCity : resolved.city,
    cityAdcode: hasManualLocation ? clean(payload.cityAdcode, 20) : resolved.cityAdcode,
    latitude: hasManualLocation ? manualLatitude : resolved.latitude,
    longitude: hasManualLocation ? manualLongitude : resolved.longitude,
    locationSource: hasManualLocation ? "人工校正" : resolved.locationSource,
    locationConfidence: hasManualLocation ? 1 : resolved.locationConfidence,
    sourceName: clean(payload.sourceName, 100) || "人工录入",
    sourceUrl: clean(payload.sourceUrl, 2000),
    sourceQuery: clean(payload.sourceQuery, 300),
    dataQuality: clean(payload.dataQuality, 500) || (resolved.city === "待解析" ? "地址待核验" : "待人工复核"),
    classificationConfidence: nullableNumber(payload.classificationConfidence) ?? 1,
    classificationBasis: clean(payload.classificationBasis, 500) || "人工指定领域",
  };
}

export async function GET(request: Request) {
  try {
    const database = await getDatabase();
    const url = new URL(request.url);
    const keyword = clean(url.searchParams.get("q"), 100);
    const domain = clean(url.searchParams.get("domain"), 40);
    const city = clean(url.searchParams.get("city"), 100);
    const year = clean(url.searchParams.get("year"), 4);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 1000, 1), 1000);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
    const where: string[] = [];
    const bindings: unknown[] = [];

    if (keyword) {
      where.push("(title LIKE ? OR applicant LIKE ? OR publication_number LIKE ? OR abstract LIKE ?)");
      const like = `%${keyword}%`;
      bindings.push(like, like, like, like);
    }
    if (domain) { where.push("eco_domain = ?"); bindings.push(domain); }
    if (city) { where.push("city = ?"); bindings.push(city); }
    if (year) { where.push("publication_date LIKE ?"); bindings.push(`${year}%`); }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `SELECT ${PATENT_COLUMNS} FROM patents ${whereSql} ORDER BY publication_date DESC, id DESC LIMIT ? OFFSET ?`;
    const [result, totalResult, domainResult, cityResult, yearResult] = await database.batch([
      database.prepare(sql).bind(...bindings, limit, offset),
      database.prepare(`SELECT COUNT(*) AS total FROM patents ${whereSql}`).bind(...bindings),
      database.prepare("SELECT eco_domain AS domain, COUNT(*) AS count FROM patents GROUP BY eco_domain"),
      database.prepare("SELECT DISTINCT city FROM patents WHERE city != '' AND city != '待解析' ORDER BY city"),
      database.prepare("SELECT DISTINCT substr(publication_date, 1, 4) AS year FROM patents WHERE length(publication_date) >= 4 ORDER BY year DESC"),
    ]);
    const patents = result.results as unknown as PatentRecord[];
    const total = Number((totalResult.results[0] as { total?: number } | undefined)?.total ?? 0);
    const domainCounts = Object.fromEntries((domainResult.results as unknown as Array<{ domain: string; count: number }>).map((item) => [item.domain, Number(item.count)]));
    const cities = (cityResult.results as unknown as Array<{ city: string }>).map((item) => item.city);
    const years = (yearResult.results as unknown as Array<{ year: string }>).map((item) => item.year).filter((item) => /^\d{4}$/.test(item));
    return Response.json({ patents, count: patents.length, total, limit, offset, domainCounts, facets: { cities, years } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取专利数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const patent = validateInput(payload);
    const database = await getDatabase();
    const result = await database.prepare(`${INSERT_PATENT_SQL} RETURNING ${PATENT_COLUMNS}`).bind(...patentBindings(patent)).first<PatentRecord>();
    return Response.json({ patent: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "新增专利失败";
    const status = /UNIQUE|unique/.test(message) ? 409 : 400;
    return Response.json({ error: status === 409 ? "该专利号已存在" : message }, { status });
  }
}

export { validateInput };
