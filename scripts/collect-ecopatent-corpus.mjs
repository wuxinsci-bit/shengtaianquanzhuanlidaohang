import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PATENT_SEARCH_STRATEGIES, titleQueryForStrategy } from "../app/data/patent-search-strategies.mjs";
import { CLASSIFICATION_VERSION, classifyPatent } from "../app/lib/domain-classifier.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cityData = JSON.parse(await readFile(path.join(projectRoot, "app/data/cities.json"), "utf8"));
const cities = cityData.cities.slice().sort((a, b) => b.name.length - a.name.length);
const maxPerDomain = Number(process.argv.find((value) => /^\d+$/.test(value)) || 1000);
const localSampleMode = process.argv.includes("--from-local-sample");
const directoryArgument = process.argv.find((value) => value.startsWith("--from-directory="));
const localExportDirectory = directoryArgument ? path.resolve(projectRoot, directoryArgument.slice("--from-directory=".length)) : "";
const querySpecs = PATENT_SEARCH_STRATEGIES.map((strategy) => ({ ...strategy, query: titleQueryForStrategy(strategy) }));

const institutionHints = [
  [/清华大学|北京大学|北京师范大学|北京林业大学|中国农业大学|中国环境科学研究院|中国科学院生态环境研究中心/, "北京市"],
  [/南京大学|河海大学|南京林业大学|南京环境科学研究所|江苏环保产业技术研究院/, "南京市"],
  [/武汉大学|华中农业大学|长江水资源保护科学研究所/, "武汉市"],
  [/中山大学|华南理工大学|华南农业大学/, "广州市"],
  [/浙江大学/, "杭州市"],
  [/同济大学|复旦大学|上海交通大学|华东师范大学/, "上海市"],
  [/厦门大学/, "厦门市"],
  [/中国海洋大学/, "青岛市"],
  [/山东大学/, "济南市"],
  [/大连海洋大学|大连理工大学/, "大连市"],
  [/天津大学|南开大学/, "天津市"],
  [/四川大学|成都理工大学/, "成都市"],
  [/重庆大学|西南大学/, "重庆市"],
  [/西北农林科技大学/, "咸阳市"],
  [/东北林业大学/, "哈尔滨市"],
  [/中南林业科技大学|湖南大学|中南大学/, "长沙市"],
  [/福建农林大学/, "福州市"],
  [/广西大学/, "南宁市"],
  [/云南大学/, "昆明市"],
  [/贵州大学/, "贵阳市"],
  [/兰州大学/, "兰州市"],
  [/新疆农业大学/, "乌鲁木齐市"],
  [/内蒙古农业大学/, "呼和浩特市"],
  [/马鞍山矿山研究总院/, "马鞍山市"],
  [/中科院合肥|合肥技术创新工程院/, "合肥市"],
  [/山西大学/, "太原市"],
  [/江西省环境保护科学研究院/, "南昌市"],
  [/杰瑞.*莱州/, "烟台市"],
];

function cleanText(value) {
  return String(value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function compact(value) {
  return cleanText(value).replace(/[\s·•,，;；()（）]/g, "");
}

function locationFor(applicant) {
  const text = compact(applicant);
  for (const city of cities) {
    if (text.includes(compact(city.name)) || (city.shortName.length >= 2 && text.includes(compact(city.shortName)))) {
      return toLocation(city, "申请人名称包含城市", 0.68);
    }
  }
  for (const [pattern, cityName] of institutionHints) {
    if (!pattern.test(text)) continue;
    const city = cities.find((item) => item.name === cityName);
    if (city) return toLocation(city, "机构名称规则推断", 0.72);
  }
  return { province: "", city: "待解析", cityAdcode: "", longitude: null, latitude: null, locationSource: "未解析", locationConfidence: 0 };
}

function toLocation(city, source, confidence) {
  return { province: city.province, city: city.name, cityAdcode: city.adcode, longitude: city.center[0], latitude: city.center[1], locationSource: source, locationConfidence: confidence };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
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
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function statusFor(publicationNumber) {
  if (/U$/.test(publicationNumber)) return "实用新型授权文本";
  if (/[BC]$/.test(publicationNumber)) return "授权文本";
  if (/A$/.test(publicationNumber)) return "公开申请文本";
  return "公开状态待核验";
}

function preferCandidate(candidate, current) {
  const rank = (number) => /[BCU]$/.test(number) ? 2 : /A$/.test(number) ? 1 : 0;
  return rank(candidate.publicationNumber) > rank(current.publicationNumber) || (rank(candidate.publicationNumber) === rank(current.publicationNumber) && candidate.publicationDate > current.publicationDate);
}

function recordFromExport(item, spec, sourceRank, sourceQuery = spec.query) {
  const publicationNumber = String(item.id || item["publication number"] || item["公开（公告）号"] || item["公开号"] || "").replace(/[-\s]/g, "");
  const title = cleanText(item.title || item["名称"] || item["专利名称"]);
  const applicant = cleanText(item.assignee || item.applicant || item["申请（专利权）人"] || item["申请人"]);
  if (!publicationNumber || !title || !applicant) return { rejected: "missing-required-fields" };
  const classification = classifyPatent(title, spec.domain);
  if (classification.domain !== spec.domain || classification.confidence < 0.85) return { rejected: "classification" };
  const location = locationFor(applicant);
  return {
    record: {
      publicationNumber,
      title,
      applicant,
      applicantAddress: cleanText(item.address || item["地址"] || item["申请人地址"]),
      abstract: cleanText(item.abstract || item["摘要"]),
      filingDate: item["filing/creation date"] || item["application date"] || item["申请日"] || "",
      publicationDate: item["publication date"] || item["公开（公告）日"] || item["公开日"] || "",
      grantDate: item["grant date"] || item["授权日"] || "",
      ipc: item.ipc || item["分类号"] || item["主分类号"] || "",
      legalStatus: statusFor(publicationNumber),
      ecoDomain: classification.domain,
      ...location,
      sourceName: item.__sourceName || "Google Patents",
      sourceUrl: item["result link"] || item["来源链接"] || `https://patents.google.com/patent/${publicationNumber}/zh`,
      sourceQuery,
      dataQuality: `真实公开记录；标题专属词检索；对象优先高置信分类；${location.city === "待解析" ? "城市待人工校正" : "城市由申请人名称推断，需复核"}`,
      classificationConfidence: classification.confidence,
      classificationBasis: `${CLASSIFICATION_VERSION}；${classification.basis}`,
      sourceRank,
    },
  };
}

function rowsToObjects(csv) {
  const rows = parseCsv(csv);
  let sourceQuery = "";
  try {
    const searchUrl = rows[0]?.[1];
    sourceQuery = searchUrl ? new URL(searchUrl).searchParams.get("q") || "" : "";
    while (/%[0-9a-f]{2}/i.test(sourceQuery)) sourceQuery = decodeURIComponent(sourceQuery);
  } catch { sourceQuery = ""; }
  const headerIndex = rows.findIndex((row) => {
    const first = String(row[0] ?? "").replace(/^\uFEFF/, "").trim().toLowerCase();
    return ["id", "publication number", "公开（公告）号", "公开号"].includes(first);
  });
  if (headerIndex < 0) throw new Error("CSV header not found");
  const headers = rows[headerIndex].map((value) => cleanText(value).toLowerCase());
  return {
    sourceQuery,
    rows: rows.slice(headerIndex + 1).map((row) => Object.fromEntries(headers.map((header, index) => [header, cleanText(row[index])]))),
  };
}

if (localExportDirectory) {
  const fileNames = await readdir(localExportDirectory);
  const patents = [];
  const globalFamilies = new Set();
  const globalPublications = new Set();
  const domainReports = {};

  for (const spec of querySpecs) {
    const matchingFiles = fileNames.filter((fileName) => fileName === `${spec.domain}.csv` || (fileName.startsWith(`${spec.domain}-`) && fileName.endsWith(".csv"))).sort();
    if (!matchingFiles.length) throw new Error(`${spec.domain}: export file not found in ${localExportDirectory}`);
    const candidates = new Map();
    let downloadedRows = 0;
    let rejected = 0;
    let duplicateFamilies = 0;
    const sourceQueries = [];

    for (const fileName of matchingFiles) {
      const parsedExport = rowsToObjects(await readFile(path.join(localExportDirectory, fileName), "utf8"));
      const rows = parsedExport.rows;
      if (parsedExport.sourceQuery) sourceQueries.push(parsedExport.sourceQuery);
      downloadedRows += rows.length;
      rows.forEach((item, sourceRank) => {
        const parsed = recordFromExport(item, spec, sourceRank, parsedExport.sourceQuery || spec.query);
        if (!parsed.record) { rejected += 1; return; }
        const familyKey = `${compact(parsed.record.title)}|${compact(parsed.record.applicant)}`;
        const current = candidates.get(familyKey);
        if (current) {
          duplicateFamilies += 1;
          if (preferCandidate(parsed.record, current)) candidates.set(familyKey, parsed.record);
        } else candidates.set(familyKey, parsed.record);
      });
    }

    const selected = [...candidates.values()]
      .sort((a, b) => a.sourceRank - b.sourceRank || b.publicationDate.localeCompare(a.publicationDate))
      .filter((record) => !globalFamilies.has(`${compact(record.title)}|${compact(record.applicant)}`) && !globalPublications.has(record.publicationNumber))
      .slice(0, maxPerDomain);
    if (selected.length < maxPerDomain) throw new Error(`${spec.domain}: needed ${maxPerDomain}, found ${selected.length} high-confidence unique records`);
    for (const record of selected) {
      globalFamilies.add(`${compact(record.title)}|${compact(record.applicant)}`);
      globalPublications.add(record.publicationNumber);
      delete record.sourceRank;
      patents.push(record);
    }
    domainReports[spec.domain] = { sourceFiles: matchingFiles, downloadedRows, highConfidenceFamilies: candidates.size, selected: selected.length, rejected, duplicateFamilies, sourceQueries, keywords: spec.keywords };
    process.stdout.write(`${spec.domain}: selected ${selected.length} from ${downloadedRows} rows\n`);
  }

  const generatedAt = new Date().toISOString();
  const report = {
    source: "Category-specific public patent CSV exports",
    classificationVersion: CLASSIFICATION_VERSION,
    confidenceThreshold: 0.85,
    requestedPerDomain: maxPerDomain,
    total: patents.length,
    domainCounts: Object.fromEntries(querySpecs.map((spec) => [spec.domain, patents.filter((item) => item.ecoDomain === spec.domain).length])),
    cityResolved: patents.filter((item) => item.city !== "待解析").length,
    uniquePublicationNumbers: new Set(patents.map((item) => item.publicationNumber)).size,
    uniqueFamilies: new Set(patents.map((item) => `${compact(item.title)}|${compact(item.applicant)}`)).size,
    allHaveSourceUrl: patents.every((item) => /^https:\/\/patents\.google\.com\/patent\//.test(item.sourceUrl)),
    allUseTitleQueries: patents.every((item) => item.sourceQuery.startsWith("TI=(")),
    domains: domainReports,
    generatedAt,
  };
  const corpus = { version: `google-cn-${CLASSIFICATION_VERSION}-${generatedAt.slice(0, 10)}-${patents.length}`, generatedAt, source: report.source, patents };
  await writeFile(path.join(projectRoot, "app/data/patent-corpus.json"), `${JSON.stringify(corpus, null, 2)}\n`, "utf8");
  await writeFile(path.join(projectRoot, "artifacts/patent-corpus-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(0);
}

if (localSampleMode) {
  const caps = { monitoring: 37, forest: 38, wetland: 126, marine: 100, biodiversity: 60, "air-climate": 6, water: 126, "soil-agri": 126, circular: 100, mining: 126, disaster: 22, urban: 61, carbon: 72 };
  const rows = parseCsv(await readFile(path.join(projectRoot, "artifacts/google-patents-sample.csv"), "utf8"));
  const headerIndex = rows.findIndex((row) => String(row[0] ?? "").replace(/^\uFEFF/, "").trim().toLowerCase() === "id");
  if (headerIndex < 0) throw new Error("Local CSV header not found");
  const headers = rows[headerIndex].map((value) => cleanText(value).toLowerCase());
  const families = new Map();

  rows.slice(headerIndex + 1).forEach((row, sourceRank) => {
    const item = Object.fromEntries(headers.map((header, index) => [header, cleanText(row[index])]));
    const publicationNumber = String(item.id || "").replace(/-/g, "");
    const title = cleanText(item.title);
    const applicant = cleanText(item.assignee);
    if (!publicationNumber || !title || !applicant) return;
    const classification = classifyPatent(title);
    if (!classification.domain || classification.confidence < 0.85) return;
    const location = locationFor(applicant);
    const record = {
      publicationNumber, title, applicant, applicantAddress: "", abstract: "",
      filingDate: item["filing/creation date"] || "", publicationDate: item["publication date"] || "", grantDate: item["grant date"] || "", ipc: "",
      legalStatus: statusFor(publicationNumber), ecoDomain: classification.domain, ...location,
      sourceName: "Google Patents", sourceUrl: item["result link"] || `https://patents.google.com/patent/${publicationNumber}/zh`, sourceQuery: "生态修复",
      dataQuality: `真实公开记录；标题级对象优先高置信分类；${location.city === "待解析" ? "城市待人工校正" : "城市由申请人名称推断，需复核"}`,
      classificationConfidence: classification.confidence,
      classificationBasis: `${CLASSIFICATION_VERSION}；${classification.basis}`,
      sourceRank,
    };
    const familyKey = `${compact(title)}|${compact(applicant)}`;
    const current = families.get(familyKey);
    if (!current || preferCandidate(record, current)) families.set(familyKey, record);
  });

  const grouped = Object.fromEntries(Object.keys(caps).map((domain) => [domain, []]));
  for (const patent of families.values()) grouped[patent.ecoDomain]?.push(patent);
  const patents = [];
  for (const spec of querySpecs) {
    const selected = grouped[spec.domain].sort((a, b) => a.sourceRank - b.sourceRank).slice(0, caps[spec.domain]);
    if (selected.length !== caps[spec.domain]) throw new Error(`${spec.domain}: needed ${caps[spec.domain]}, found ${selected.length}`);
    patents.push(...selected.map((item) => {
      const patent = { ...item };
      delete patent.sourceRank;
      return patent;
    }));
  }
  if (patents.length !== 1000) throw new Error(`Expected 1000 curated patents, got ${patents.length}`);
  const generatedAt = new Date().toISOString();
  const corpus = { version: `google-cn-${CLASSIFICATION_VERSION}-${generatedAt.slice(0, 10)}-1000`, generatedAt, source: "Google Patents public CSV export", patents };
  const report = {
    source: corpus.source, sourceFile: "google-patents-sample.csv", sourceRows: rows.length - headerIndex - 1,
    uniqueHighConfidenceFamilies: families.size, total: patents.length, classificationVersion: CLASSIFICATION_VERSION,
    confidenceThreshold: 0.85, domainCounts: Object.fromEntries(querySpecs.map((spec) => [spec.domain, patents.filter((item) => item.ecoDomain === spec.domain).length])),
    cityResolved: patents.filter((item) => item.city !== "待解析").length,
    allHaveSourceUrl: patents.every((item) => /^https:\/\/patents\.google\.com\/patent\//.test(item.sourceUrl)),
    generatedAt,
  };
  await writeFile(path.join(projectRoot, "app/data/patent-corpus.json"), `${JSON.stringify(corpus, null, 2)}\n`, "utf8");
  await writeFile(path.join(projectRoot, "artifacts/patent-corpus-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(0);
}

const checkpointPath = path.join(projectRoot, "artifacts/ecopatent-crawl-checkpoint.json");
let checkpoint = null;
try { checkpoint = JSON.parse(await readFile(checkpointPath, "utf8")); } catch { checkpoint = null; }
const patentsByFamily = new Map((checkpoint?.patents ?? []).map((item) => [`${compact(item.title)}|${compact(item.applicant)}`, item]));
const report = checkpoint?.report ?? { source: "Google Patents public CSV export", classificationVersion: CLASSIFICATION_VERSION, requestedPerDomain: maxPerDomain, domains: {}, rejected: 0, duplicateFamilies: 0, downloadedBytes: 0 };
const completedDomains = new Set(checkpoint?.completedDomains ?? []);

for (const spec of querySpecs) {
  if (completedDomains.has(spec.domain)) {
    process.stdout.write(`${spec.domain}: resumed from checkpoint\n`);
    continue;
  }
  const expression = `q=(${spec.query})&country=CN&language=CHINESE`;
  const downloadUrl = `https://patents.google.com/xhr/query?url=${encodeURIComponent(expression)}&exp=&download=true`;
  const response = await fetch(downloadUrl, { headers: { "User-Agent": "EcoPatentNavigator/0.2 educational research corpus" }, signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new Error(`${spec.domain}: source returned ${response.status}`);
  const csv = await response.text();
  report.downloadedBytes += Buffer.byteLength(csv);
  if (csv.length > 20_000_000) throw new Error(`${spec.domain}: result exceeded 20 MB safety limit`);
  const rows = parseCsv(csv);
  const headerIndex = rows.findIndex((row) => String(row[0] ?? "").replace(/^\uFEFF/, "").trim().toLowerCase() === "id");
  if (headerIndex < 0) throw new Error(`${spec.domain}: CSV header not found`);
  const headers = rows[headerIndex].map((value) => cleanText(value).toLowerCase());
  let accepted = 0;
  let rejected = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    if (accepted >= maxPerDomain) break;
    const item = Object.fromEntries(headers.map((header, index) => [header, cleanText(row[index])]));
    const publicationNumber = String(item.id || "").replace(/-/g, "");
    const title = cleanText(item.title);
    const applicant = cleanText(item.assignee);
    if (!publicationNumber || !title || !applicant) { rejected += 1; continue; }
    const classification = classifyPatent(title, spec.domain);
    if (classification.domain !== spec.domain || classification.confidence < 0.85) { rejected += 1; continue; }
    const location = locationFor(applicant);
    const record = {
      publicationNumber,
      title,
      applicant,
      applicantAddress: "",
      abstract: "",
      filingDate: item["filing/creation date"] || "",
      publicationDate: item["publication date"] || "",
      grantDate: item["grant date"] || "",
      ipc: "",
      legalStatus: statusFor(publicationNumber),
      ecoDomain: classification.domain,
      ...location,
      sourceName: "Google Patents",
      sourceUrl: item["result link"] || `https://patents.google.com/patent/${publicationNumber}/zh`,
      sourceQuery: spec.query,
      dataQuality: `公开导出；标题级对象优先分类；${location.city === "待解析" ? "城市待人工校正" : "城市由申请人名称推断，需复核"}`,
      classificationConfidence: classification.confidence,
      classificationBasis: `${CLASSIFICATION_VERSION}；${classification.basis}`,
    };
    const familyKey = `${compact(title)}|${compact(applicant)}`;
    const current = patentsByFamily.get(familyKey);
    if (current) {
      report.duplicateFamilies += 1;
      if (preferCandidate(record, current)) patentsByFamily.set(familyKey, record);
    } else {
      patentsByFamily.set(familyKey, record);
      accepted += 1;
    }
  }

  report.domains[spec.domain] = { accepted, rejected, downloadedRows: rows.length - headerIndex - 1 };
  report.rejected += rejected;
  completedDomains.add(spec.domain);
  await writeFile(checkpointPath, `${JSON.stringify({ completedDomains: [...completedDomains], patents: [...patentsByFamily.values()], report }, null, 2)}\n`, "utf8");
  process.stdout.write(`${spec.domain}: accepted ${accepted}, rejected ${rejected}, bytes ${Buffer.byteLength(csv)}\n`);
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}

const domainOrder = new Map(querySpecs.map((item, index) => [item.domain, index]));
const patents = [...patentsByFamily.values()].sort((a, b) => (domainOrder.get(a.ecoDomain) - domainOrder.get(b.ecoDomain)) || b.publicationDate.localeCompare(a.publicationDate));
report.total = patents.length;
report.cityResolved = patents.filter((item) => item.city !== "待解析").length;
report.highConfidence = patents.filter((item) => item.classificationConfidence >= 0.85).length;
report.generatedAt = new Date().toISOString();

const corpus = { version: `google-cn-${CLASSIFICATION_VERSION}-${report.generatedAt.slice(0, 10)}`, generatedAt: report.generatedAt, source: report.source, patents };
await writeFile(path.join(projectRoot, "app/data/patent-corpus.json"), `${JSON.stringify(corpus, null, 2)}\n`, "utf8");
await writeFile(path.join(projectRoot, "artifacts/patent-corpus-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await unlink(checkpointPath).catch(() => {});
process.stdout.write(`TOTAL ${patents.length}; city resolved ${report.cityResolved}; high confidence ${report.highConfidence}\n`);
