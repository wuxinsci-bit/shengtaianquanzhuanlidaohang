import type { PatentInput } from "@/app/lib/patents";

const common = {
  applicantAddress: "",
  abstract: "",
  ipc: "",
  legalStatus: "授权",
  sourceName: "Google Patents",
  sourceQuery: "生态修复",
  dataQuality: "公开导出已核对；城市由机构名称规则推断，需人工复核",
  classificationConfidence: 0.72,
  classificationBasis: "旧版演示数据；发布语料更新后由对象优先规则替换",
};

export const SEED_PATENTS: PatentInput[] = [
  { ...common, publicationNumber: "CN117974401B", title: "基于多源数据和模型集成的生态修复区域智能识别方法", applicant: "南京大学", filingDate: "2024-03-29", publicationDate: "2024-06-21", grantDate: "2024-06-21", ecoDomain: "monitoring", province: "江苏省", city: "南京市", cityAdcode: "320100", latitude: 32.060255, longitude: 118.796877, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN117974401B/zh" },
  { ...common, publicationNumber: "CN113428996B", title: "一种水生态修复设备及其使用方法", applicant: "江苏环保产业技术研究院股份公司", filingDate: "2021-07-05", publicationDate: "2022-09-23", grantDate: "2022-09-23", ecoDomain: "water", province: "江苏省", city: "南京市", cityAdcode: "320100", latitude: 32.060255, longitude: 118.796877, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN113428996B/zh" },
  { ...common, publicationNumber: "CN113649409B", title: "矿山酸性尾矿库/排土场生态修复方法", applicant: "中钢集团马鞍山矿山研究总院股份有限公司", filingDate: "2021-08-27", publicationDate: "2022-08-16", grantDate: "2022-08-16", ecoDomain: "mining", province: "安徽省", city: "马鞍山市", cityAdcode: "340500", latitude: 31.689362, longitude: 118.507906, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN113649409B/zh" },
  { ...common, publicationNumber: "CN109470831B", title: "一种水生态监测与修复水面机器人及水生态修复控制方法", applicant: "中科院合肥技术创新工程院", filingDate: "2018-12-27", publicationDate: "2023-12-22", grantDate: "2023-12-22", ecoDomain: "wetland", province: "安徽省", city: "合肥市", cityAdcode: "340100", latitude: 31.820586, longitude: 117.227239, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN109470831B/zh" },
  { ...common, publicationNumber: "CN112897972B", title: "一种固废基多孔材料、制备及用于煤矸石山生态修复方法", applicant: "山西大学", filingDate: "2021-01-28", publicationDate: "2021-11-30", grantDate: "2021-11-30", ecoDomain: "circular", province: "山西省", city: "太原市", cityAdcode: "140100", latitude: 37.857014, longitude: 112.549248, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN112897972B/zh" },
  { ...common, publicationNumber: "CN106228610B", title: "结合主导生态功能与生态退化程度的生态修复分区方法", applicant: "环境保护部南京环境科学研究所", filingDate: "2016-07-25", publicationDate: "2018-10-30", grantDate: "2018-10-30", ecoDomain: "biodiversity", province: "江苏省", city: "南京市", cityAdcode: "320100", latitude: 32.060255, longitude: 118.796877, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN106228610B/zh" },
  { ...common, publicationNumber: "CN110637668B", title: "一种离子型稀土废弃矿区边坡土壤立体修复结构及方法", applicant: "江西省环境保护科学研究院", filingDate: "2019-11-13", publicationDate: "2024-05-28", grantDate: "2024-05-28", ecoDomain: "mining", province: "江西省", city: "南昌市", cityAdcode: "360100", latitude: 28.676493, longitude: 115.892151, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN110637668B/zh" },
  { ...common, publicationNumber: "CN109526523B", title: "一种在酸性尾矿库上进行生态修复的方法", applicant: "杰瑞（莱州）矿山治理有限公司", filingDate: "2019-01-04", publicationDate: "2021-04-20", grantDate: "2021-04-20", ecoDomain: "mining", province: "山东省", city: "烟台市", cityAdcode: "370600", latitude: 37.463822, longitude: 121.447935, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN109526523B/zh" },
  { ...common, publicationNumber: "CN114139986B", title: "一种基于生态系统服务视角的区域生态修复规划方法", applicant: "北京师范大学", filingDate: "2021-12-03", publicationDate: "2024-06-21", grantDate: "2024-06-21", ecoDomain: "urban", province: "北京市", city: "北京市", cityAdcode: "110000", latitude: 39.904989, longitude: 116.405285, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN114139986B/zh" },
  { ...common, publicationNumber: "CN105961120B", title: "一种适用于干旱区矿山生态修复边坡植被快速恢复方法", applicant: "北京林业大学", filingDate: "2016-05-26", publicationDate: "2019-03-05", grantDate: "2019-03-05", ecoDomain: "mining", province: "北京市", city: "北京市", cityAdcode: "110000", latitude: 39.904989, longitude: 116.405285, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN105961120B/zh" },
  { ...common, publicationNumber: "CN115293473B", title: "一种林草生态修复效果评价方法", applicant: "中国建筑股份有限公司", filingDate: "2022-01-19", publicationDate: "2023-07-25", grantDate: "2023-07-25", ecoDomain: "forest", province: "北京市", city: "北京市", cityAdcode: "110000", latitude: 39.904989, longitude: 116.405285, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN115293473B/zh" },
  { ...common, publicationNumber: "CN114049520B", title: "面向枯水期水位抬升影响的湖泊湿地生态修复方法", applicant: "长江水资源保护科学研究所", filingDate: "2021-11-19", publicationDate: "2022-08-09", grantDate: "2022-08-09", ecoDomain: "wetland", province: "湖北省", city: "武汉市", cityAdcode: "420100", latitude: 30.584355, longitude: 114.298572, locationSource: "机构名称规则推断", locationConfidence: .72, sourceUrl: "https://patents.google.com/patent/CN114049520B/zh" },
];
