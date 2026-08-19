import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const dataRoot = new URL("../app/data/", import.meta.url);
const compile = async (name) => ts.transpileModule(
  await readFile(new URL(name, dataRoot), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
).outputText;
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;

const extraUrl = dataUrl(await compile("assistant-extra-knowledge.ts"));
const knowledgeSource = (await compile("assistant-knowledge.ts")).replaceAll("./assistant-extra-knowledge", extraUrl);
const knowledgeUrl = dataUrl(knowledgeSource);
const bankSource = (await compile("assistant-question-bank.ts")).replaceAll("./assistant-knowledge", knowledgeUrl);
const knowledge = await import(knowledgeUrl);
const bank = await import(dataUrl(bankSource));

const normalize = (value) => value.toLowerCase().replace(/[\s，。！？、；：：“”‘’（）()【】[\]{}<>《》,.!?;:'"`]/g, "");
const stopWords = new Set(["平台", "问题", "如何", "怎么", "可以", "什么", "数据", "专利", "系统", "查看", "需要"]);
function classify(question) {
  const query = normalize(question);
  const exact = bank.assistantExactQuestionMap.get(query);
  if (exact) return exact;
  let best = { id: "unknown", score: 0 };
  for (const item of knowledge.assistantKnowledge) {
    let score = 0;
    const title = normalize(item.title);
    if (query.includes(title) || title.includes(query)) score += 12;
    for (const keyword of item.keywords) {
      const normalized = normalize(keyword);
      if (normalized && !stopWords.has(normalized) && query.includes(normalized)) score += Math.min(12, Math.max(3, normalized.length * 1.2));
    }
    if (score > best.score) best = { id: item.id, score };
  }
  return best.score >= 3 ? best.id : "unknown";
}

assert.ok(bank.assistantQuestionBank.length >= 10000, `问题变体只有 ${bank.assistantQuestionBank.length} 条`);
const checks = new Map([
  ["森林草原火灾有哪些检索关键词？", "forest-keywords"],
  ["公开数据源返回503怎么办？", "503"],
  ["专利所在地是怎么解析的？", "city"],
  ["海绵城市专利怎么分类？", "urban-human"],
  ["中国大陆访问不了怎么办？", "mainland"],
  ["如何写仿真实验报告？", "experiment-report"],
]);
for (const [question, expected] of checks) assert.equal(classify(question), expected, `${question} 未命中 ${expected}`);
console.log(JSON.stringify({ intents: knowledge.assistantKnowledge.length, variants: bank.assistantQuestionBank.length, checks: checks.size }));
