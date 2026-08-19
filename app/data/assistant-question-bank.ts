import { assistantKnowledge } from "./assistant-knowledge";
import type { AssistantKnowledge } from "./assistant-knowledge";

export type AssistantQuestionVariant = {
  question: string;
  intentId: string;
  category: string;
};

const prefixes = [
  "请问，", "想请教一下，", "我想了解，", "请帮我说明，", "能否解释一下，", "我不太清楚，",
  "在平台操作时，", "在课程学习中，", "在实际项目里，", "在答辩展示时，", "作为学生，",
  "作为教师，", "如果我要研究这个问题，", "如果我要做专利导航，", "如果我第一次使用平台，",
  "从数据分析角度看，", "从教学实践角度看，", "从创新创业角度看，", "从系统使用角度看，",
  "在没有经验的情况下，", "我现在遇到的情况是，", "我想确认一下，", "请给我一个操作说明，",
  "能不能用简单的话说明，",
];

const contexts = [
  "", "在平台中", "在专利地图中", "在数据采集模块中", "在课程作业中", "在虚拟仿真实验中",
  "在创新创业项目中", "在项目答辩中", "在本地运行时", "在团队协作时", "在数据核验时", "在公开检索时",
];

const patterns = [
  "{anchor}怎么检索？", "{anchor}如何查询？", "{anchor}具体怎么操作？", "{anchor}是什么意思？",
  "怎样查看{anchor}相关记录？", "如何判断记录是否属于{anchor}？", "如何对{anchor}进行分类？",
  "如何分析{anchor}的专利分布？", "如何给{anchor}做数据核验？", "如何把{anchor}用于课程教学？",
  "如何把{anchor}用于答辩展示？", "如何从{anchor}中发现技术机会？", "{anchor}出现问题时怎么办？",
  "{anchor}有哪些常见误区？", "{anchor}应该记录哪些信息？", "{anchor}的结果应该如何解释？",
  "{anchor}和相近类别如何区分？", "{anchor}的来源在哪里查看？", "{anchor}能否导出或保存？",
  "完成{anchor}需要哪些步骤？", "新手如何开始{anchor}？", "怎样提高{anchor}的准确性？",
  "怎样避免{anchor}产生重复结果？", "怎样向别人介绍{anchor}？", "{anchor}在系统中的入口在哪里？",
  "{anchor}为什么会没有结果？", "{anchor}的数据边界是什么？", "{anchor}适合解决什么问题？",
  "{anchor}有哪些可复核的证据？", "{anchor}的结果能直接作为结论吗？",
];

const genericKeywords = new Set(["平台", "功能", "作用", "介绍", "问题", "帮助", "数据", "记录", "查询", "系统", "用户", "课程"]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s，。！？、；：：“”‘’（）()【】[\]{}<>《》,.!?;:'"`]/g, "");
}

function subject(item: AssistantKnowledge) {
  return item.title.replace(/[？?]$/, "").replace(/^平台有哪些/, "").replace(/^什么是/, "").replace(/包括什么$/, "");
}

function anchors(item: AssistantKnowledge) {
  const candidates = [subject(item), ...item.keywords].filter((value) => {
    const normalized = normalize(value);
    return normalized.length >= 3 && !genericKeywords.has(value) && !genericKeywords.has(normalized);
  });
  return [...new Set(candidates)].slice(0, 8);
}

export function buildAssistantQuestionBank(items = assistantKnowledge): AssistantQuestionVariant[] {
  const variants: AssistantQuestionVariant[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const itemAnchors = anchors(item);
    const mainSubject = subject(item);
    for (let index = 0; index < 220; index += 1) {
      const anchor = itemAnchors[index % itemAnchors.length] ?? mainSubject;
      const prefix = prefixes[index % prefixes.length];
      const context = contexts[Math.floor(index / prefixes.length) % contexts.length];
      const pattern = patterns[index % patterns.length].replace("{anchor}", anchor);
      const question = `${prefix}${context ? `${context}，` : ""}${pattern}`;
      const normalized = normalize(question);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        variants.push({ question, intentId: item.id, category: item.category });
      }
    }
    const canonical = normalize(item.title);
    if (!seen.has(canonical)) {
      seen.add(canonical);
      variants.push({ question: item.title, intentId: item.id, category: item.category });
    }
  }
  return variants;
}

export const assistantQuestionBank = buildAssistantQuestionBank();
export const assistantQuestionBankCount = assistantQuestionBank.length;
export const assistantExactQuestionMap = new Map(assistantQuestionBank.map((entry) => [normalize(entry.question), entry.intentId]));

export function normalizeAssistantQuestion(value: string) {
  return normalize(value);
}
