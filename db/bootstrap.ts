import { env } from "cloudflare:workers";
import { CORPUS_VERSION, PATENT_CORPUS } from "@/app/data/patent-corpus";
import type { PatentInput } from "@/app/lib/patents";

let initialized = false;

export const PATENT_COLUMNS = `
  id,
  publication_number AS publicationNumber,
  title,
  applicant,
  applicant_address AS applicantAddress,
  abstract,
  filing_date AS filingDate,
  publication_date AS publicationDate,
  grant_date AS grantDate,
  ipc,
  legal_status AS legalStatus,
  eco_domain AS ecoDomain,
  province,
  city,
  city_adcode AS cityAdcode,
  latitude,
  longitude,
  location_source AS locationSource,
  location_confidence AS locationConfidence,
  source_name AS sourceName,
  source_url AS sourceUrl,
  source_query AS sourceQuery,
  data_quality AS dataQuality,
  classification_confidence AS classificationConfidence,
  classification_basis AS classificationBasis,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export const INSERT_PATENT_SQL = `
  INSERT INTO patents (
    publication_number, title, applicant, applicant_address, abstract,
    filing_date, publication_date, grant_date, ipc, legal_status, eco_domain,
    province, city, city_adcode, latitude, longitude, location_source,
    location_confidence, source_name, source_url, source_query, data_quality,
    classification_confidence, classification_basis
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const UPSERT_PATENT_CLAUSE = `
  ON CONFLICT(publication_number) DO UPDATE SET
    title=excluded.title,
    applicant=excluded.applicant,
    applicant_address=excluded.applicant_address,
    filing_date=excluded.filing_date,
    publication_date=excluded.publication_date,
    grant_date=excluded.grant_date,
    legal_status=excluded.legal_status,
    eco_domain=excluded.eco_domain,
    province=CASE WHEN patents.location_source = '人工校正' THEN patents.province ELSE excluded.province END,
    city=CASE WHEN patents.location_source = '人工校正' THEN patents.city ELSE excluded.city END,
    city_adcode=CASE WHEN patents.location_source = '人工校正' THEN patents.city_adcode ELSE excluded.city_adcode END,
    latitude=CASE WHEN patents.location_source = '人工校正' THEN patents.latitude ELSE excluded.latitude END,
    longitude=CASE WHEN patents.location_source = '人工校正' THEN patents.longitude ELSE excluded.longitude END,
    location_source=CASE WHEN patents.location_source = '人工校正' THEN patents.location_source ELSE excluded.location_source END,
    location_confidence=CASE WHEN patents.location_source = '人工校正' THEN patents.location_confidence ELSE excluded.location_confidence END,
    source_url=excluded.source_url,
    source_query=excluded.source_query,
    data_quality=excluded.data_quality,
    classification_confidence=excluded.classification_confidence,
    classification_basis=excluded.classification_basis,
    updated_at=CURRENT_TIMESTAMP`;

export const UPSERT_PATENT_SQL = `${INSERT_PATENT_SQL}${UPSERT_PATENT_CLAUSE}`;

export function patentBindings(patent: PatentInput) {
  return [
    patent.publicationNumber,
    patent.title,
    patent.applicant,
    patent.applicantAddress,
    patent.abstract,
    patent.filingDate,
    patent.publicationDate,
    patent.grantDate,
    patent.ipc,
    patent.legalStatus,
    patent.ecoDomain,
    patent.province,
    patent.city,
    patent.cityAdcode,
    patent.latitude,
    patent.longitude,
    patent.locationSource,
    patent.locationConfidence,
    patent.sourceName,
    patent.sourceUrl,
    patent.sourceQuery,
    patent.dataQuality,
    patent.classificationConfidence,
    patent.classificationBasis,
  ];
}

export async function getDatabase() {
  const database = env.DB;
  if (!database) throw new Error("数据库绑定不可用");
  if (initialized) return database;

  await database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS patents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      publication_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      applicant TEXT NOT NULL,
      applicant_address TEXT NOT NULL DEFAULT '',
      abstract TEXT NOT NULL DEFAULT '',
      filing_date TEXT NOT NULL DEFAULT '',
      publication_date TEXT NOT NULL DEFAULT '',
      grant_date TEXT NOT NULL DEFAULT '',
      ipc TEXT NOT NULL DEFAULT '',
      legal_status TEXT NOT NULL DEFAULT '',
      eco_domain TEXT NOT NULL,
      province TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '待解析',
      city_adcode TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      location_source TEXT NOT NULL DEFAULT '未解析',
      location_confidence REAL NOT NULL DEFAULT 0,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL DEFAULT '',
      source_query TEXT NOT NULL DEFAULT '',
      data_quality TEXT NOT NULL DEFAULT '待核验',
      classification_confidence REAL NOT NULL DEFAULT 0,
      classification_basis TEXT NOT NULL DEFAULT '待分类复核',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_patents_publication_number ON patents(publication_number)"),
    database.prepare("CREATE INDEX IF NOT EXISTS idx_patents_domain_city ON patents(eco_domain, city)"),
    database.prepare("CREATE INDEX IF NOT EXISTS idx_patents_publication_date ON patents(publication_date)"),
    database.prepare(`CREATE TABLE IF NOT EXISTS collection_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name TEXT NOT NULL,
      query_text TEXT NOT NULL,
      status TEXT NOT NULL,
      imported_count INTEGER NOT NULL DEFAULT 0,
      unresolved_count INTEGER NOT NULL DEFAULT 0,
      message TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT NOT NULL DEFAULT ''
    )`),
    database.prepare(`CREATE TABLE IF NOT EXISTS catalog_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`),
  ]);

  const patentColumns = await database.prepare("PRAGMA table_info(patents)").all<{ name: string }>();
  const columnNames = new Set(patentColumns.results.map((column) => column.name));
  if (!columnNames.has("classification_confidence")) {
    await database.prepare("ALTER TABLE patents ADD COLUMN classification_confidence REAL NOT NULL DEFAULT 0").run();
  }
  if (!columnNames.has("classification_basis")) {
    await database.prepare("ALTER TABLE patents ADD COLUMN classification_basis TEXT NOT NULL DEFAULT '待分类复核'").run();
  }

  await database.prepare("PRAGMA optimize").run();
  initialized = true;
  return database;
}

function multiRowUpsert(database: D1Database, patents: PatentInput[]) {
  const values = patents.map(() => `(${Array.from({ length: 24 }, () => "?").join(",")})`).join(",");
  const sql = `
    INSERT INTO patents (
      publication_number, title, applicant, applicant_address, abstract,
      filing_date, publication_date, grant_date, ipc, legal_status, eco_domain,
      province, city, city_adcode, latitude, longitude, location_source,
      location_confidence, source_name, source_url, source_query, data_quality,
      classification_confidence, classification_basis
    ) VALUES ${values}${UPSERT_PATENT_CLAUSE}`;
  return database.prepare(sql).bind(...patents.flatMap(patentBindings));
}

export async function syncPatentCorpusChunk(chunkSize = 128) {
  const database = await getDatabase();
  const safeChunkSize = Math.min(Math.max(Math.floor(chunkSize), 4), 128);
  const metaResult = await database.prepare(
    "SELECT key, value FROM catalog_meta WHERE key IN ('patent_corpus_version', 'patent_corpus_target_version', 'patent_corpus_cursor')",
  ).all<{ key: string; value: string }>();
  const meta = Object.fromEntries(metaResult.results.map((row) => [row.key, row.value]));

  if (meta.patent_corpus_version === CORPUS_VERSION) {
    return { complete: true, version: CORPUS_VERSION, cursor: PATENT_CORPUS.length, total: PATENT_CORPUS.length };
  }

  let cursor = meta.patent_corpus_target_version === CORPUS_VERSION
    ? Math.max(0, Math.min(Number(meta.patent_corpus_cursor) || 0, PATENT_CORPUS.length))
    : 0;

  if (meta.patent_corpus_target_version !== CORPUS_VERSION) {
    await database.batch([
      database.prepare("DELETE FROM patents WHERE source_name='Google Patents' AND location_source != '人工校正'"),
      database.prepare(`
        INSERT INTO catalog_meta(key, value) VALUES
          ('patent_corpus_target_version', ?),
          ('patent_corpus_cursor', '0')
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
      `).bind(CORPUS_VERSION),
    ]);
    cursor = 0;
  }

  const nextCursor = Math.min(cursor + safeChunkSize, PATENT_CORPUS.length);
  const statements = [];
  for (let start = cursor; start < nextCursor; start += 4) {
    statements.push(multiRowUpsert(database, PATENT_CORPUS.slice(start, Math.min(start + 4, nextCursor))));
  }
  if (statements.length) await database.batch(statements);

  const complete = nextCursor >= PATENT_CORPUS.length;
  if (complete) {
    await database.batch([
      database.prepare(`
        INSERT INTO catalog_meta(key, value) VALUES('patent_corpus_version', ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
      `).bind(CORPUS_VERSION),
      database.prepare("DELETE FROM catalog_meta WHERE key IN ('patent_corpus_target_version', 'patent_corpus_cursor')"),
    ]);
  } else {
    await database.prepare(`
      INSERT INTO catalog_meta(key, value) VALUES('patent_corpus_cursor', ?)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value
    `).bind(String(nextCursor)).run();
  }

  return { complete, version: CORPUS_VERSION, cursor: nextCursor, total: PATENT_CORPUS.length };
}
