# 生态智图：生态安全专利导航虚拟仿真平台

面向“生态安全领域专利导航课程体系构建与创新创业人才培养”的教学科研平台原型。平台把课程学习、公开专利数据采集、地级市解析、专利地图、教学仿真和项目孵化连接为一条完整实践链。

## 已实现功能

- 视频式引导页与综合门户首页
- 13类生态安全技术主题体系
- 课程五大模块及课程—平台任务映射
- 专利增、删、改、查与多条件检索
- 基于申请人地址/机构规则的地级市解析，内置337条地级行政单元词典
- 地图点击查属性、属性筛选与列表点击定位地图
- Google Patents 公开导出端点小批量采集，含限流、去重、来源与质量标注
- 教学情景推演实验室和创新创业项目画布
- Cloudflare D1 持久化和可部署站点结构

## 数据边界

“专利所在地”默认指申请人地址解析到的地级市，不代表技术实施地、发明人所在地或专利权属结论。若公开导出缺少申请人地址，系统只在机构规则明确时进行低置信度推断，并标记“需复核”；其余记录进入“待解析”队列。

正式大规模研究建议使用国家知识产权局知识产权数据资源公共服务系统下载的开放基础数据，或使用 Google Patents BigQuery 公共数据集。当前网页采集通道只用于课堂小批量验证。

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev
```

默认访问 `http://127.0.0.1:3000/`。数据库表会在首次访问接口时初始化并写入一组来源可追溯的示例专利。

## 构建与测试

```powershell
npm.cmd run build
npm.cmd test
```

数据库结构位于 `db/schema.ts`，迁移文件位于 `drizzle/`。行政区划词典可通过下列命令重新生成：

```powershell
node scripts/sync-city-dictionary.mjs
```

## 公开来源

- 国家知识产权公共服务平台：https://ggfw.cnipa.gov.cn/home
- Google Patents：https://patents.google.com/
- Google Patents Public Datasets：https://console.cloud.google.com/marketplace/product/google_patents_public_datasets/google-patents-public-data
- 生态环境部生态环境科普：https://www.mee.gov.cn/ywgz/kjycw/sthjkjcx/sthjkp/
- 超星课程：https://mooc1.chaoxing.com/mooc-ans/course/portal/pZVsIQjqc-6iY5NMp68a0g==

