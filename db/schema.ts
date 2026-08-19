import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const patents = sqliteTable("patents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  publicationNumber: text("publication_number").notNull(),
  title: text("title").notNull(),
  applicant: text("applicant").notNull(),
  applicantAddress: text("applicant_address").notNull().default(""),
  abstract: text("abstract").notNull().default(""),
  filingDate: text("filing_date").notNull().default(""),
  publicationDate: text("publication_date").notNull().default(""),
  grantDate: text("grant_date").notNull().default(""),
  ipc: text("ipc").notNull().default(""),
  legalStatus: text("legal_status").notNull().default(""),
  ecoDomain: text("eco_domain").notNull(),
  province: text("province").notNull().default(""),
  city: text("city").notNull().default("待解析"),
  cityAdcode: text("city_adcode").notNull().default(""),
  latitude: real("latitude"),
  longitude: real("longitude"),
  locationSource: text("location_source").notNull().default("未解析"),
  locationConfidence: real("location_confidence").notNull().default(0),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url").notNull().default(""),
  sourceQuery: text("source_query").notNull().default(""),
  dataQuality: text("data_quality").notNull().default("待核验"),
  classificationConfidence: real("classification_confidence").notNull().default(0),
  classificationBasis: text("classification_basis").notNull().default("待分类复核"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_patents_publication_number").on(table.publicationNumber),
  index("idx_patents_domain_city").on(table.ecoDomain, table.city),
  index("idx_patents_publication_date").on(table.publicationDate),
]);

export const collectionJobs = sqliteTable("collection_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceName: text("source_name").notNull(),
  queryText: text("query_text").notNull(),
  status: text("status").notNull(),
  importedCount: integer("imported_count").notNull().default(0),
  unresolvedCount: integer("unresolved_count").notNull().default(0),
  message: text("message").notNull().default(""),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  finishedAt: text("finished_at").notNull().default(""),
});

export const catalogMeta = sqliteTable("catalog_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
