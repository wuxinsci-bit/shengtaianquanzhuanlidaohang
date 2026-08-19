const RULES = [
  { id: "monitoring", priority: 10, strong: ["生态环境监测", "生态监测", "环境质量监测", "生态遥感", "卫星生态监测", "无人机生态监测", "生态预警", "生态传感器", "生态数字孪生", "生态大数据", "环境风险监测"], terms: ["遥感监测", "卫星监测", "无人机监测", "在线监测", "智能监测", "监测网络", "生态评价", "环境评价", "生态识别", "环境感知"] },
  { id: "forest", priority: 98, strong: ["森林草原火灾", "森林火灾", "草原火灾", "森林防火", "草原防火", "林火监测", "林火预警", "火险预警", "火情识别", "森林灭火", "草原灭火", "火场通信"], terms: ["林火", "防火监测", "火源监测", "烟火识别", "火灾扑救", "灭火装备", "火灾监测"] },
  { id: "wetland", priority: 82, strong: ["湿地生态", "湿地修复", "湿地监测", "河湖生态", "河湖连通", "流域生态", "水生态修复", "河流生态修复", "河道生态修复", "湖泊生态修复", "水生境修复", "河口湿地", "水下森林"], terms: ["湿地", "河湖", "流域治理", "河道生态", "湖泊生态", "水生境", "水生态"] },
  { id: "marine", priority: 90, strong: ["海洋生态", "海岸带", "近岸生态", "海洋污染", "海洋环境", "海洋环境监测", "海岸带监测", "近岸监测", "赤潮监测", "海洋溢油", "红树林", "珊瑚礁", "海草床", "海岛生态"], terms: ["海水污染", "海洋监测", "海岸修复", "岸线修复", "近海环境", "海洋生境"] },
  { id: "biodiversity", priority: 85, strong: ["生物多样性", "生物安全", "外来入侵", "入侵物种", "栖息地", "野生动物", "濒危物种", "物种保护", "物种监测", "物种识别", "种质资源保护", "生态廊道"], terms: ["生物防控", "有害生物监测", "野生植物保护"] },
  { id: "air-climate", priority: 70, strong: ["大气污染", "空气污染", "环境空气", "气候风险", "气候适应", "温室气体"], terms: ["烟气治理", "废气治理", "大气监测", "空气质量", "气溶胶监测", "臭氧监测", "颗粒物监测"] },
  { id: "water", priority: 70, strong: ["水污染", "污水处理", "废水处理", "地下水污染", "饮用水安全", "黑臭水体", "水质安全"], terms: ["水质监测", "水处理", "水体净化", "水环境治理", "水污染防治", "水源地保护", "污水净化"] },
  { id: "soil-agri", priority: 80, strong: ["土壤污染", "土壤修复", "农田生态", "农业面源污染", "耕地质量", "盐碱地", "重金属污染土壤"], terms: ["农田", "耕地", "土壤监测", "土壤改良", "农药残留", "面源污染", "农业生态", "土地退化"] },
  { id: "circular", priority: 85, strong: ["固体废物", "固废", "危险废物", "垃圾资源化", "废弃物资源化", "循环经济", "资源循环"], terms: ["垃圾处理", "废物处理", "资源化利用", "再生利用", "无害化处理", "垃圾分类", "废弃物"] },
  { id: "mining", priority: 95, strong: ["矿山生态", "矿区生态", "矿山修复", "矿区修复", "尾矿库", "尾矿治理", "尾矿生态", "采煤沉陷", "排土场", "废弃矿山", "矿山边坡", "矿区边坡", "煤矸石山", "矿区土地复垦", "矿山地质环境", "矿山地质灾害", "矿山植被恢复", "矿区植被恢复", "矿山土壤修复", "矿区土壤修复"], terms: ["露天矿", "国土空间生态修复", "土地整治"] },
  { id: "disaster", priority: 75, strong: ["地质灾害", "洪水预警", "山洪预警", "滑坡预警", "泥石流预警", "环境应急", "突发环境事件", "自然灾害"], terms: ["灾害监测", "灾害预警", "洪涝", "干旱监测", "应急监测", "应急处置", "风险评估"] },
  { id: "urban", priority: 65, strong: ["城市生态", "海绵城市", "城市热岛", "城市内涝", "人居环境", "绿色基础设施"], terms: ["城市绿地", "城市环境", "城市水系", "城市更新", "生态城市", "城市雨洪", "城市噪声"] },
  { id: "carbon", priority: 100, strong: ["生态碳汇", "森林碳汇", "草原碳汇", "湿地碳汇", "海洋碳汇", "碳汇", "碳中和", "碳足迹", "生态产品价值", "蓝碳", "碳监测", "碳核算", "碳捕集", "碳封存"], terms: ["碳减排", "低碳", "碳交易", "温室气体减排", "二氧化碳固定"] },
];

function normalize(value) {
  return String(value ?? "").toLowerCase().replace(/[\s·•,，;；:：()（）\-_/]/g, "");
}

function scoreRule(normalized, rule) {
  const strong = rule.strong.filter((term) => normalized.includes(normalize(term)));
  const terms = rule.terms.filter((term) => normalized.includes(normalize(term)));
  return { score: strong.length * 8 + terms.length * 4, matches: [...strong, ...terms] };
}

export const CLASSIFICATION_VERSION = "object-first-v3-title-strict";
export const DOMAIN_CLASSIFICATION_RULES = RULES;

export function classifyPatent(text, hintedDomain = "") {
  const normalized = normalize(text);
  const ranked = RULES.map((rule) => {
    const result = scoreRule(normalized, rule);
    const hintBoost = result.score > 0 && hintedDomain === rule.id ? 1 : 0;
    return { id: rule.id, priority: rule.priority, score: result.score + hintBoost, matches: result.matches };
  }).sort((a, b) => b.score - a.score || b.priority - a.priority);

  const best = ranked[0];
  const second = ranked[1];
  if (!best || best.score < 4) {
    return { domain: null, confidence: 0, basis: "未命中领域专属词，拒绝强制分类", matches: [], scores: ranked };
  }

  const margin = best.score - (second?.score ?? 0);
  let confidence = 0.58;
  if (best.score >= 16 || margin >= 12) confidence = 0.94;
  else if (best.score >= 8 && margin >= 4) confidence = 0.86;
  else if (best.score >= 5 && margin >= 2) confidence = 0.72;

  return {
    domain: best.id,
    confidence,
    basis: `对象优先规则；命中：${best.matches.join("、") || "领域提示"}`,
    matches: best.matches,
    scores: ranked,
  };
}
