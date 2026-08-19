import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifyPatent } from "../app/lib/domain-classifier.mjs";

test("uses ecological object before monitoring technology", () => {
  assert.equal(classifyPatent("森林火灾遥感监测预警系统").domain, "forest");
  assert.equal(classifyPatent("海洋生态环境监测浮标").domain, "marine");
  assert.equal(classifyPatent("湿地水生态修复装置").domain, "wetland");
  assert.equal(classifyPatent("矿山生态修复土壤改良方法").domain, "mining");
});

test("does not force generic or unrelated patents into a domain", () => {
  assert.equal(classifyPatent("基于多源数据的生态修复区域智能识别方法").domain, null);
  assert.notEqual(classifyPatent("一种林草生态修复效果评价方法").domain, "forest");
  assert.notEqual(classifyPatent("森林健康监测与林地恢复方法").domain, "forest");
  assert.equal(classifyPatent("一种普通机械连接装置").domain, null);
});

test("curated corpus contains at least 1000 traceable records in every domain", async () => {
  const corpus = JSON.parse(await readFile(new URL("../app/data/patent-corpus.json", import.meta.url), "utf8"));
  const patents = corpus.patents;
  assert.ok(patents.length >= 13000);
  assert.equal(new Set(patents.map((item) => item.publicationNumber)).size, patents.length);
  assert.equal(new Set(patents.map((item) => `${item.title.replace(/\s/g, "")}|${item.applicant.replace(/\s/g, "")}`)).size, patents.length);
  assert.equal(new Set(patents.map((item) => item.ecoDomain)).size, 13);
  const counts = Object.groupBy(patents, (item) => item.ecoDomain);
  assert.ok(Object.values(counts).every((items) => (items?.length ?? 0) >= 1000));
  assert.ok(patents.every((item) => item.classificationConfidence >= 0.85));
  assert.ok(patents.every((item) => /^https:\/\/patents\.google\.com\/patent\//.test(item.sourceUrl)));
  assert.ok(patents.every((item) => item.sourceQuery.startsWith("TI=(")));
});
