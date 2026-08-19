import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://geo.datav.aliyun.com/areas_v3/bound";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "app/data/cities.json");

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "EcoPatentNavigator/0.1 educational prototype" },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function centerOf(feature) {
  const point = feature?.properties?.center || feature?.properties?.centroid;
  return Array.isArray(point) && point.length >= 2 ? point : null;
}

const national = await fetchJson(`${SOURCE}/100000_full.json`);
const provinces = national.features
  .map((feature) => ({
    name: String(feature.properties.name || "").trim(),
    adcode: String(feature.properties.adcode || ""),
    center: centerOf(feature),
  }))
  .filter((province) => /^\d{6}$/.test(province.adcode) && province.name);

const municipalities = new Set(["110000", "120000", "310000", "500000"]);
const cities = [];

for (const province of provinces) {
  if (municipalities.has(province.adcode)) {
    cities.push({
      name: province.name,
      shortName: province.name.replace(/[市]$/, ""),
      adcode: province.adcode,
      province: province.name,
      center: province.center,
      level: "municipality",
    });
    continue;
  }

  try {
    const provinceGeoJson = await fetchJson(`${SOURCE}/${province.adcode}_full.json`);
    for (const feature of provinceGeoJson.features || []) {
      const properties = feature.properties || {};
      const name = String(properties.name || "").trim();
      const adcode = String(properties.adcode || "");
      const center = centerOf(feature);
      if (!name || !/^\d{6}$/.test(adcode) || !adcode.endsWith("00") || !center) continue;
      cities.push({
        name,
        shortName: name.replace(/(市|地区|自治州|盟)$/, ""),
        adcode,
        province: province.name,
        center,
        level: properties.level || "city",
      });
    }
  } catch (error) {
    console.warn(`Skipped ${province.name}: ${error.message}`);
  }
}

cities.sort((a, b) => a.adcode.localeCompare(b.adcode));
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `${JSON.stringify({ source: SOURCE, generatedAt: new Date().toISOString(), cities }, null, 2)}\n`,
  "utf8",
);
console.log(`Wrote ${cities.length} prefecture-level records to ${output}`);
