import cityData from "@/app/data/cities.json";

type CityEntry = {
  name: string;
  shortName: string;
  adcode: string;
  province: string;
  center: [number, number];
};

const cities = (cityData.cities as CityEntry[]).slice().sort((a, b) => b.name.length - a.name.length);

const institutionHints: Array<[RegExp, string]> = [
  [/清华大学|北京大学|中国农业大学|中国环境科学研究院|中国科学院生态环境研究中心/, "北京市"],
  [/南京大学|南京环境科学研究所|江苏环保产业技术研究院/, "南京市"],
  [/河海大学|南京林业大学/, "南京市"],
  [/武汉大学|华中农业大学/, "武汉市"],
  [/中山大学|华南理工大学|华南农业大学/, "广州市"],
  [/浙江大学/, "杭州市"],
  [/同济大学|复旦大学|上海交通大学|华东师范大学/, "上海市"],
  [/厦门大学/, "厦门市"],
  [/中国海洋大学/, "青岛市"],
  [/大连海洋大学|大连理工大学/, "大连市"],
  [/天津大学|南开大学/, "天津市"],
  [/四川大学|成都理工大学/, "成都市"],
  [/西北农林科技大学/, "咸阳市"],
  [/东北林业大学/, "哈尔滨市"],
  [/中南林业科技大学|湖南大学|中南大学/, "长沙市"],
  [/马鞍山矿山研究总院|马鞍山矿院/, "马鞍山市"],
  [/中科院合肥|合肥技术创新工程院/, "合肥市"],
  [/山西大学/, "太原市"],
  [/江西省环境保护科学研究院/, "南昌市"],
  [/杰瑞.*莱州|莱州市/, "烟台市"],
  [/北京师范大学|北京林业大学|中国建筑股份有限公司/, "北京市"],
  [/长江水资源保护科学研究所/, "武汉市"],
];

function normalized(value: string) {
  return value.replace(/[\s·•,，;；()（）]/g, "");
}

function toResult(city: CityEntry, source: string, confidence: number) {
  return {
    province: city.province,
    city: city.name,
    cityAdcode: city.adcode,
    longitude: city.center[0],
    latitude: city.center[1],
    locationSource: source,
    locationConfidence: confidence,
  };
}

export function resolvePrefectureCity(address: string, applicant = "") {
  const addressText = normalized(address);
  const combined = normalized(`${address} ${applicant}`);

  if (addressText) {
    for (const city of cities) {
      if (addressText.includes(normalized(city.name))) return toResult(city, "申请人地址精确匹配", 0.96);
      if (city.shortName.length >= 2 && addressText.includes(normalized(city.shortName))) return toResult(city, "申请人地址名称匹配", 0.86);
    }
  }

  for (const [pattern, cityName] of institutionHints) {
    if (!pattern.test(combined)) continue;
    const city = cities.find((entry) => entry.name === cityName);
    if (city) return toResult(city, "机构名称规则推断", 0.72);
  }

  const applicantText = normalized(applicant);
  if (applicantText) {
    for (const city of cities) {
      if (applicantText.includes(normalized(city.name))) return toResult(city, "申请人名称包含城市", 0.68);
      if (city.shortName.length >= 2 && applicantText.includes(normalized(city.shortName))) return toResult(city, "申请人名称包含城市简称", 0.62);
    }
  }

  return {
    province: "",
    city: "待解析",
    cityAdcode: "",
    longitude: null,
    latitude: null,
    locationSource: "未解析",
    locationConfidence: 0,
  };
}
