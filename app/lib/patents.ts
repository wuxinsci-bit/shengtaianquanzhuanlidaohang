import { classifyPatent as classifyPatentByRules } from "./domain-classifier.mjs";

export type EcoDomainId =
  | "monitoring"
  | "forest"
  | "wetland"
  | "marine"
  | "biodiversity"
  | "air-climate"
  | "water"
  | "soil-agri"
  | "circular"
  | "mining"
  | "disaster"
  | "urban"
  | "carbon";

export interface EcoDomain {
  id: EcoDomainId;
  code: string;
  name: string;
  short: string;
  description: string;
  keywords: string[];
  color: string;
}

export interface PatentRecord {
  id: number;
  publicationNumber: string;
  title: string;
  applicant: string;
  applicantAddress: string;
  abstract: string;
  filingDate: string;
  publicationDate: string;
  grantDate: string;
  ipc: string;
  legalStatus: string;
  ecoDomain: EcoDomainId;
  province: string;
  city: string;
  cityAdcode: string;
  latitude: number | null;
  longitude: number | null;
  locationSource: string;
  locationConfidence: number;
  sourceName: string;
  sourceUrl: string;
  sourceQuery: string;
  dataQuality: string;
  classificationConfidence: number;
  classificationBasis: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PatentInput = Omit<PatentRecord, "id" | "createdAt" | "updatedAt">;

export const ECO_DOMAINS: EcoDomain[] = [
  { id: "monitoring", code: "01", name: "生态监测与数字治理", short: "监测治理", description: "遥感、传感器、生态大数据、智能识别与预警。", keywords: ["监测", "遥感", "传感", "识别", "预警", "数字孪生"], color: "#5aa786" },
  { id: "forest", code: "02", name: "森林草原火灾", short: "森林草原火灾", description: "森林草原火灾监测、预警、扑救、防控与灾后恢复。", keywords: ["森林火灾", "草原火灾", "森林防火", "草原防火", "林火监测", "火险预警"], color: "#397455" },
  { id: "wetland", code: "03", name: "湿地、河湖与流域", short: "湿地流域", description: "湿地恢复、河湖连通、水生态系统与流域治理。", keywords: ["湿地", "河湖", "流域", "水生态", "湖泊"], color: "#3c8e8b" },
  { id: "marine", code: "04", name: "海洋与海岸带安全", short: "海洋海岸", description: "近岸生态、海洋污染、蓝碳与海岛修复。", keywords: ["海洋", "海岸", "近岸", "海岛", "珊瑚", "蓝碳"], color: "#397dac" },
  { id: "biodiversity", code: "05", name: "生物多样性与生物安全", short: "生物安全", description: "物种保护、栖息地、外来入侵与种质资源。", keywords: ["生物多样性", "栖息地", "物种", "外来入侵", "生物安全"], color: "#738e46" },
  { id: "air-climate", code: "06", name: "大气污染与气候风险", short: "大气气候", description: "大气治理、温室气体、极端气候与适应技术。", keywords: ["大气", "空气污染", "温室气体", "气候", "烟气", "碳排放"], color: "#77879c" },
  { id: "water", code: "07", name: "水污染防治与水安全", short: "水安全", description: "饮用水、污水处理、地下水与水质风险控制。", keywords: ["水污染", "污水", "水质", "饮用水", "地下水", "水处理"], color: "#3575a6" },
  { id: "soil-agri", code: "08", name: "土壤、农田与农业生态", short: "土壤农业", description: "土壤修复、面源污染、耕地质量与绿色农业。", keywords: ["土壤", "农田", "耕地", "农业生态", "面源污染", "农药"], color: "#9a7b45" },
  { id: "circular", code: "09", name: "固废与循环经济", short: "固废循环", description: "固废处置、资源化利用、减量化与循环材料。", keywords: ["固废", "废弃物", "资源化", "循环利用", "垃圾", "再生"], color: "#a46f44" },
  { id: "mining", code: "10", name: "矿山与国土生态修复", short: "矿山修复", description: "矿山地质环境、尾矿、边坡与国土空间修复。", keywords: ["矿山生态", "尾矿库", "排土场", "采煤沉陷", "国土空间生态修复"], color: "#8d6346" },
  { id: "disaster", code: "11", name: "自然灾害与环境应急", short: "灾害应急", description: "洪旱、滑坡、泥石流、污染事故与环境应急决策。", keywords: ["地质灾害", "环境应急", "洪水", "山洪", "滑坡", "泥石流"], color: "#b65d4a" },
  { id: "urban", code: "12", name: "城市生态与人居环境", short: "城市人居", description: "海绵城市、噪声、热岛、绿色基础设施与健康环境。", keywords: ["城市生态", "海绵城市", "噪声", "热岛", "人居", "绿色基础设施"], color: "#756ca3" },
  { id: "carbon", code: "13", name: "碳汇、减排与生态产品", short: "碳汇减排", description: "森林与海洋碳汇、生态价值实现和低碳技术。", keywords: ["碳汇", "减排", "低碳", "生态产品", "碳中和", "碳足迹"], color: "#5d8c70" },
];

export const COURSE_MODULES = [
  { number: "01", title: "生态安全与专利导航基础", outcome: "建立生态安全问题边界与专利导航基本认知", lessons: ["课程导论——为何要学习生态安全专利导航？", "生态安全的定义、原则与全球挑战", "生态安全与可持续发展目标（SDGs）的关联", "中国生态安全政策框架", "专利导航概述", "生态安全领域的专利示例"] },
  { number: "02", title: "专利导航方法论与工具应用", outcome: "完成检索式、数据清洗、景观分析与专项导航", lessons: ["定量分析技术", "风险评估", "数据来源与检索工具", "专利景观分析（PLRs）的构建步骤", "专利导航——从理论到实践", "专利导航项目管理与操作实务", "生态安全专项导航"] },
  { number: "03", title: "创新创业人才培养框架", outcome: "把专利情报转化为技术机会与创业判断", lessons: ["创新创业理论", "专利导航在创新创业中的整合", "人才培养策略", "国际专利框架"] },
  { number: "04", title: "实践教学与项目孵化", outcome: "形成专利方案、项目路演材料与初步知识产权布局", lessons: ["实践模式", "专利撰写与申请实务", "创新创业活动", "案例分析"] },
  { number: "05", title: "前沿趋势与综合评估", outcome: "完成综合导航报告与人才培养成效评价", lessons: ["前沿话题", "人才培养成效评估", "课程总结"] },
] as const;

export const SCIENCE_RESOURCES = [
  { tag: "生态科普", title: "生态环境部生态环境科普专栏", description: "面向公众的生态环境科技成果、科普作品与政策解读。", url: "https://www.mee.gov.cn/ywgz/kjycw/sthjkjcx/sthjkp/", source: "生态环境部" },
  { tag: "生态安全", title: "维护国家生态安全权威问答", description: "从自然空间、水资源、生物多样性与人居环境理解生态安全边界。", url: "https://www.ndrc.gov.cn/xxgk/jd/jd/201704/t20170415_1182804.html", source: "国家发展改革委" },
  { tag: "修复行动", title: "生态系统修复：让退化趋势逆转", description: "联合国生态系统恢复十年视频与公众行动入口。", url: "https://www.unep.org/news-and-stories/video/ecosystem-restoration", source: "UNEP" },
  { tag: "专利公共服务", title: "国家知识产权公共服务平台", description: "专利检索、分析、专题数据库与基础数据开放入口。", url: "https://ggfw.cnipa.gov.cn/home", source: "国家知识产权局" },
] as const;

export const SIMULATION_SCENARIOS = [
  { id: "river", title: "河湖水生态修复", domain: "wetland", question: "不同技术方案对修复时效、生态扰动和运维负担有何影响？", metrics: ["水质改善", "生境恢复", "运维复杂度"] },
  { id: "mine", title: "矿山退化地修复", domain: "mining", question: "在坡度、酸度和植被覆盖约束下，哪类专利组合更稳健？", metrics: ["边坡稳定", "土壤改良", "植被恢复"] },
  { id: "wildfire", title: "森林火灾监测", domain: "forest", question: "传感、遥感和通信方案怎样改变发现时延与覆盖范围？", metrics: ["发现时延", "空间覆盖", "误报风险"] },
  { id: "invasive", title: "外来物种防控", domain: "biodiversity", question: "识别、阻断和治理技术如何组合以降低扩散风险？", metrics: ["识别准确率", "响应时效", "生态副作用"] },
  { id: "coast", title: "海岸带蓝碳修复", domain: "marine", question: "恢复潜力、岸线稳定与社区成本之间如何权衡？", metrics: ["蓝碳潜力", "岸线韧性", "实施成本"] },
  { id: "waste", title: "固废资源化路径", domain: "circular", question: "减量、再生和安全处置方案的综合收益如何比较？", metrics: ["资源化率", "二次污染", "经济可行性"] },
] as const;

export function domainById(id: string) {
  return ECO_DOMAINS.find((domain) => domain.id === id) ?? ECO_DOMAINS[0];
}

export function classifyPatent(text: string, hintedDomain = "") {
  return classifyPatentByRules(text, hintedDomain);
}

export function classifyDomain(text: string): EcoDomainId | null {
  return classifyPatentByRules(text).domain;
}
