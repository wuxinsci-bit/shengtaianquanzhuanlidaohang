"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowLeftRight, BarChart3, Check, ChevronRight, CircleHelp, Copy, Database, Download, Edit3, ExternalLink, FileSearch, FlaskConical, Layers3, Lightbulb, ListFilter, LoaderCircle, Map, MapPin, Plus, RefreshCw, Rocket, Search, ShieldCheck, Sparkles, Trash2, Upload, X } from "lucide-react";
import { ECO_DOMAINS, SIMULATION_SCENARIOS, domainById, type EcoDomainId, type PatentInput, type PatentRecord } from "@/app/lib/patents";
import { SEED_PATENTS } from "@/app/data/seed-patents";
import { PATENT_SEARCH_STRATEGIES, titleQueryForStrategy } from "@/app/data/patent-search-strategies.mjs";
import { MapView } from "./MapView";

type TabId = "map" | "collect" | "lab" | "venture";

const initialPatents = SEED_PATENTS.map((patent, index) => ({ ...patent, id: index + 1 })) as PatentRecord[];

const emptyPatent: PatentInput = {
  publicationNumber: "", title: "", applicant: "", applicantAddress: "", abstract: "",
  filingDate: "", publicationDate: "", grantDate: "", ipc: "", legalStatus: "公开状态待核验",
  ecoDomain: "monitoring", province: "", city: "待解析", cityAdcode: "", latitude: null,
  longitude: null, locationSource: "未解析", locationConfidence: 0, sourceName: "人工录入",
  sourceUrl: "", sourceQuery: "", dataQuality: "待核验",
  classificationConfidence: 1, classificationBasis: "人工指定领域",
};

function confidenceLabel(value: number) {
  if (value >= .9) return "高置信";
  if (value >= .6) return "需复核";
  return "待解析";
}

const PATENT_SOURCES = [
  { id: "google", name: "Google Patents", url: "https://patents.google.com/", note: "可直接打开带标题检索式的结果页并导出 CSV。" },
  { id: "cnipa", name: "国家知识产权局", url: "https://pss-system.cponline.cnipa.gov.cn/conventionalSearch", note: "官方检索、分析与数据下载入口，部分功能需登录。" },
  { id: "cnki", name: "中国知网专利库", url: "https://kns.cnki.net/KNS8/AdvSearch?dbcode=SCPD", note: "支持中国专利全文检索，下载权限取决于机构订购。" },
  { id: "baiten", name: "佰腾专利检索", url: "https://www.baiten.cn/", note: "支持网页检索；开放 API 需申请授权凭证。" },
  { id: "gpic", name: "广东知识产权数据接口", url: "https://open.gpic.gd.cn/", note: "提供检索与下载 API，调用前需注册应用并授权。" },
  { id: "wanfang", name: "万方中外专利", url: "https://c.wanfangdata.com.cn/patent", note: "国内专利检索补充入口，导出权限以账号为准。" },
] as const;

export function PatentWorkspace({ initialTab, initialDomain }: { initialTab?: string; initialDomain?: string }) {
  const requestedTab = initialTab as TabId | undefined;
  const [tab, setTab] = useState<TabId>(requestedTab && ["map", "collect", "lab", "venture"].includes(requestedTab) ? requestedTab : "map");
  const [patents, setPatents] = useState<PatentRecord[]>(initialPatents);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [domain, setDomain] = useState(initialDomain && ECO_DOMAINS.some((item) => item.id === initialDomain) ? initialDomain : "");
  const [city, setCity] = useState("");
  const [year, setYear] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(initialPatents[0]?.id ?? null);
  const [editor, setEditor] = useState<PatentRecord | "new" | null>(null);
  const [catalogTotal, setCatalogTotal] = useState(initialPatents.length);
  const [matchTotal, setMatchTotal] = useState(initialPatents.length);
  const [domainCounts, setDomainCounts] = useState<Record<string, number>>({});
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const loadPatents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "1000" });
      if (domain) params.set("domain", domain);
      if (keyword) params.set("q", keyword);
      if (city) params.set("city", city);
      if (year) params.set("year", year);
      const response = await fetch(`/api/patents?${params}`, { cache: "no-store" });
      const result = await response.json() as { patents?: PatentRecord[]; total?: number; domainCounts?: Record<string, number>; facets?: { cities?: string[]; years?: string[] }; error?: string };
      if (!response.ok) throw new Error(result.error || "读取数据失败");
      setPatents(result.patents ?? []);
      setCatalogTotal(Object.values(result.domainCounts ?? {}).reduce((sum, count) => sum + count, 0) || result.total || result.patents?.length || 0);
      setMatchTotal(result.total ?? result.patents?.length ?? 0);
      setDomainCounts(result.domainCounts ?? {});
      setAvailableCities(result.facets?.cities ?? []);
      setAvailableYears(result.facets?.years ?? []);
      setError("");
      if (result.patents?.length) setSelectedId((current) => result.patents!.some((item) => item.id === current) ? current : result.patents![0].id);
    } catch (requestError) {
      setError(`${requestError instanceof Error ? requestError.message : "数据库暂不可用"}，当前显示可追溯演示数据。`);
    } finally {
      setLoading(false);
    }
  }, [city, domain, keyword, year]);

  useEffect(() => {
    // The external patent store must hydrate once after the client mounts.
    const timer = window.setTimeout(() => void loadPatents(), 250);
    return () => window.clearTimeout(timer);
  }, [loadPatents]);

  const filtered = useMemo(() => patents.filter((patent) => {
    const term = keyword.toLowerCase();
    const keywordMatch = !term || `${patent.title} ${patent.applicant} ${patent.publicationNumber} ${patent.abstract}`.toLowerCase().includes(term);
    return keywordMatch && (!domain || patent.ecoDomain === domain) && (!city || patent.city === city) && (!year || patent.publicationDate.startsWith(year));
  }), [patents, keyword, domain, city, year]);

  const selected = patents.find((patent) => patent.id === selectedId) ?? null;
  const resolvedCount = patents.filter((patent) => patent.city !== "待解析").length;
  const applicants = new Set(patents.map((patent) => patent.applicant)).size;

  const onMapSelect = useCallback((patent: PatentRecord) => {
    setSelectedId(patent.id);
    setCity(patent.city);
  }, []);

  async function removePatent(patent: PatentRecord) {
    if (!window.confirm(`确认删除 ${patent.publicationNumber}？`)) return;
    const response = await fetch(`/api/patents/${patent.id}`, { method: "DELETE" });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setError(result.error || "删除失败"); return; }
    setPatents((current) => current.filter((item) => item.id !== patent.id));
    setSelectedId(null);
  }

  function clearFilters() { setKeyword(""); setDomain(""); setCity(""); setYear(""); }

  return (
    <div className="workspace-shell">
      <header className="workspace-topbar">
        <div><p className="section-kicker">ECO PATENT WORKBENCH</p><h1>生态安全专利导航虚拟仿真平台</h1></div>
        <div className="workspace-status"><span className="status-dot" />公开数据原型 <small>最后加载：本次访问</small></div>
      </header>

      <nav className="workspace-tabs" aria-label="工作台模块">
        {[
          ["map", Map, "专利地图"], ["collect", Database, "数据采集"], ["lab", FlaskConical, "仿真实验"], ["venture", Rocket, "项目孵化"],
        ].map(([id, Icon, label]) => {
          const TabIcon = Icon as typeof Map;
          return <button key={String(id)} className={tab === id ? "active" : ""} onClick={() => setTab(id as TabId)}><TabIcon size={17} />{String(label)}</button>;
        })}
      </nav>

      {error && <div className="workspace-alert"><AlertTriangle size={17} />{error}<button onClick={() => setError("")} aria-label="关闭提示"><X size={15} /></button></div>}

      {tab === "map" && (
        <section className="map-workspace">
          <aside className="filter-panel">
            <div className="panel-title"><div><ListFilter size={17} /><strong>属性查询</strong></div><button onClick={clearFilters}>重置</button></div>
            <label className="search-field"><Search size={16} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="名称、申请人、专利号" /></label>
            <label><span>生态技术领域</span><select value={domain} onChange={(event) => setDomain(event.target.value)}><option value="">全部领域</option>{ECO_DOMAINS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label><span>所在地级市</span><select value={city} onChange={(event) => setCity(event.target.value)}><option value="">全部城市</option>{availableCities.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>公开年份</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">全部年份</option>{availableYears.map((item) => <option key={item}>{item}</option>)}</select></label>
            <div className="filter-summary"><strong>{matchTotal}</strong><span>件命中专利</span><small>当前加载 {filtered.length} 条，地图同步更新</small></div>
            <button className="button button--dark button--full" onClick={() => setEditor("new")}><Plus size={16} />新增专利</button>
            <div className="query-tip"><ArrowLeftRight size={17} /><p><strong>双向查询</strong>点击地图圆点查看城市属性；点击专利卡片，地图自动定位。</p></div>
          </aside>

          <div className="map-stage">
            <div className="map-toolbar">
              <div><span className="legend-dot" />圆点大小表示当前城市专利数量</div>
              <div><button onClick={() => setCity("")}><Layers3 size={15} />全国视图</button><button onClick={() => void loadPatents()}>{loading ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}刷新</button></div>
            </div>
            <MapView patents={filtered} selectedId={selectedId} onSelect={onMapSelect} />
            <div className="map-stats">
              <div><small>专利总记录</small><strong>{catalogTotal}</strong></div>
              <div><small>申请主体</small><strong>{applicants}</strong></div>
              <div><small>城市已解析</small><strong>{resolvedCount}</strong></div>
              <div><small>解析率</small><strong>{patents.length ? Math.round(resolvedCount / patents.length * 100) : 0}%</strong></div>
            </div>
          </div>

          <aside className="result-panel">
            <div className="panel-title"><div><FileSearch size={17} /><strong>属性结果</strong></div><span>{filtered.length} / {matchTotal} 条</span></div>
            <div className="patent-list">
              {filtered.length === 0 && <div className="empty-state"><CircleHelp size={26} /><p>没有匹配记录</p><button onClick={clearFilters}>清除筛选</button></div>}
              {filtered.map((patent) => {
                const itemDomain = domainById(patent.ecoDomain);
                return <button className={`patent-card ${selectedId === patent.id ? "active" : ""}`} onClick={() => setSelectedId(patent.id)} key={patent.id}>
                  <span className="patent-domain" style={{ color: itemDomain.color }}>{itemDomain.short}</span>
                  <h3>{patent.title}</h3>
                  <p>{patent.applicant}</p>
                  <div><span><MapPin size={13} />{patent.city}</span><span>{patent.publicationDate.slice(0, 4) || "年份待核"}</span></div>
                </button>;
              })}
            </div>
            {selected && <PatentDetail patent={selected} onEdit={() => setEditor(selected)} onDelete={() => void removePatent(selected)} />}
          </aside>
        </section>
      )}

      {tab === "collect" && <Collector patents={patents} domainCounts={domainCounts} onCollected={() => void loadPatents()} />}
      {tab === "lab" && <SimulationLab patents={patents} selected={selected} onSelectPatent={setSelectedId} />}
      {tab === "venture" && <VentureStudio selected={selected} />}
      {editor && <PatentEditor record={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSaved={(saved) => { setPatents((current) => editor === "new" ? [saved, ...current] : current.map((item) => item.id === saved.id ? saved : item)); setSelectedId(saved.id); setEditor(null); }} />}
    </div>
  );
}

function PatentDetail({ patent, onEdit, onDelete }: { patent: PatentRecord; onEdit: () => void; onDelete: () => void }) {
  return <div className="patent-detail">
    <div className="detail-head"><span>当前选择</span><div><button onClick={onEdit} aria-label="编辑"><Edit3 size={15} /></button><button onClick={onDelete} aria-label="删除"><Trash2 size={15} /></button></div></div>
    <h3>{patent.title}</h3>
    <dl><div><dt>专利号</dt><dd>{patent.publicationNumber}</dd></div><div><dt>申请人</dt><dd>{patent.applicant}</dd></div><div><dt>所在地</dt><dd>{patent.province} {patent.city}</dd></div><div><dt>城市解析</dt><dd><span className={`confidence confidence--${confidenceLabel(patent.locationConfidence)}`}>{confidenceLabel(patent.locationConfidence)}</span> {patent.locationSource}</dd></div><div><dt>领域分类</dt><dd>{Math.round(patent.classificationConfidence * 100)}% · {patent.classificationBasis}</dd></div><div><dt>数据来源</dt><dd>{patent.sourceName}</dd></div><div><dt>标题检索式</dt><dd className="query-value">{patent.sourceQuery || "人工录入"}</dd></div></dl>
    {patent.sourceUrl && <a href={patent.sourceUrl} target="_blank" rel="noreferrer">查看公开来源 <ExternalLink size={14} /></a>}
  </div>;
}

function Collector({ patents, domainCounts, onCollected }: { patents: PatentRecord[]; domainCounts: Record<string, number>; onCollected: () => void }) {
  const initialStrategy = PATENT_SEARCH_STRATEGIES[0];
  const [query, setQuery] = useState(titleQueryForStrategy(initialStrategy));
  const [domain, setDomain] = useState(initialStrategy.domain);
  const [sourceId, setSourceId] = useState<(typeof PATENT_SOURCES)[number]["id"]>("google");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const unresolved = patents.filter((patent) => patent.city === "待解析").length;

  function chooseStrategy(nextDomain: string) {
    const strategy = PATENT_SEARCH_STRATEGIES.find((item) => item.domain === nextDomain);
    if (!strategy) return;
    setDomain(strategy.domain);
    setQuery(titleQueryForStrategy(strategy));
    setMessage("");
  }

  function openSearch() {
    const source = PATENT_SOURCES.find((item) => item.id === sourceId)!;
    const url = source.id === "google" ? `https://patents.google.com/?q=${encodeURIComponent(query)}&country=CN&language=CHINESE` : source.url;
    window.open(url, "_blank", "noopener,noreferrer");
    setMessage(source.id === "google" ? "已打开标题级分类检索，可在结果页下载 CSV。" : `已打开${source.name}；请粘贴页面所示检索式并按该平台权限导出。`);
  }

  async function copyQuery() {
    await navigator.clipboard.writeText(query);
    setMessage("检索式已复制。国内平台字段语法不同，可将 TI 替换为“名称/标题”。");
  }

  async function importCsv() {
    if (!file) { setMessage("请先选择从专利平台导出的 CSV 文件。"); return; }
    setBusy(true); setMessage("");
    try {
      const source = PATENT_SOURCES.find((item) => item.id === sourceId)!;
      const body = new FormData();
      body.set("file", file);
      body.set("domain", domain);
      body.set("sourceName", source.name);
      body.set("sourceQuery", query);
      const response = await fetch("/api/import", { method: "POST", body });
      const result = await response.json() as { imported?: number; unresolved?: number; rejected?: number; error?: string };
      if (!response.ok) throw new Error(result.error || "导入失败");
      setMessage(`已导入或更新 ${result.imported ?? 0} 条；拒绝跨类或低相关 ${result.rejected ?? 0} 条；${result.unresolved ?? 0} 条城市待人工校正。`);
      onCollected();
    } catch (error) { setMessage(error instanceof Error ? error.message : "导入失败"); }
    finally { setBusy(false); }
  }

  return <section className="module-page collect-page">
    <div className="module-intro"><div><p className="section-kicker">MULTI-SOURCE PATENT PIPELINE</p><h2>分类检索、公开导出与城市解析</h2><p>13 类分别使用标题专属词检索。平台内置库每类 1000 条；新增数据可从国家知识产权局、知网、佰腾、万方、广东知识产权接口或 Google Patents 导出后严格分类导入。</p></div><div className="module-badge"><Download size={22} /><strong>13,000</strong><span>13 类 × 1000 条</span></div></div>
    <div className="collect-grid">
      <div className="collector-card">
        <div className="card-heading"><Database size={18} /><div><strong>多来源分类采集</strong><span>先检索下载，再校验导入</span></div></div>
        <div className="two-fields"><label><span>专利数据源</span><select value={sourceId} onChange={(event) => setSourceId(event.target.value as (typeof PATENT_SOURCES)[number]["id"])}>{PATENT_SOURCES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>目标类别（严格）</span><select value={domain} onChange={(event) => chooseStrategy(event.target.value)}>{ECO_DOMAINS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        <label><span>标题检索式</span><textarea className="query-textarea" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="collector-actions"><button className="button button--dark" onClick={openSearch}><ExternalLink size={16} />打开来源检索</button><button className="button button--soft" onClick={() => void copyQuery()}><Copy size={16} />复制检索式</button></div>
        <label className="file-picker"><span>导入导出结果（CSV）</span><input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <button className="button button--dark button--full" onClick={() => void importCsv()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}{busy ? "正在校验与导入…" : "校验分类并导入 CSV"}</button>
        {message && <p className="collector-message">{message}</p>}
        <small>Excel 文件请先另存为 UTF-8 CSV。平台只接受与所选类别一致且分类置信度不低于 85% 的记录。</small>
      </div>
      <div className="pipeline-card">
        <div className="card-heading"><Activity size={18} /><div><strong>严格分类流水线</strong><span>来源、检索式与处理结果均保留</span></div></div>
        {[
          ["01", "类别检索", "每类使用独立的标题字段词组，不使用单一“生态安全”泛词。"],
          ["02", "来源导出", "保留来源平台、公开号、申请人、日期、检索式和公开链接。"],
          ["03", "严格归类", "对象优先分类；跨类或低于 85% 置信度的记录拒绝写入。"],
          ["04", "城市解析", "优先匹配申请人地址；缺失时使用机构名称规则并标记复核。"],
          ["05", "去重入库", "按公开号和标题—申请人专利族去重，保留人工校正位置。"],
        ].map(([number, title, text]) => <div className="pipeline-step" key={number}><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}
      </div>
    </div>
    <section className="strategy-section">
      <div className="strategy-heading"><div><p className="section-kicker">13 DOMAIN SEARCH STRATEGIES</p><h3>分门别类的标题检索关键词</h3></div><span>点击类别即可装载检索式</span></div>
      <div className="strategy-grid">{PATENT_SEARCH_STRATEGIES.map((strategy) => <button type="button" className={domain === strategy.domain ? "active" : ""} key={strategy.domain} onClick={() => chooseStrategy(strategy.domain)}><div><strong>{strategy.name}</strong><span>{domainCounts[strategy.domain] ?? 0} 条已入库</span></div><p>{strategy.keywords.map((keyword) => <i key={keyword}>{keyword}</i>)}</p></button>)}</div>
    </section>
    <div className="source-grid">
      {PATENT_SOURCES.map((source, index) => <div key={source.id}><span className={`source-status ${index === 1 ? "source-status--primary" : ""}`}>{source.id === "google" ? "公开导出" : source.id === "cnipa" ? "官方来源" : "国内补充"}</span><h3>{source.name}</h3><p>{source.note}</p><a href={source.url} target="_blank" rel="noreferrer">打开数据源 <ExternalLink size={14} /></a></div>)}
      <div><span className="source-status source-status--warning">待校正</span><h3>城市解析工作队列</h3><p>当前加载结果中有 <strong>{unresolved}</strong> 条未解析到地级市，可在专利地图中编辑校正。</p><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>返回工作台顶部</button></div>
    </div>
  </section>;
}

function SimulationLab({ patents, selected, onSelectPatent }: { patents: PatentRecord[]; selected: PatentRecord | null; onSelectPatent: (id: number) => void }) {
  const [scenarioId, setScenarioId] = useState(SIMULATION_SCENARIOS[0].id);
  const [maturity, setMaturity] = useState(68);
  const [fit, setFit] = useState(74);
  const [cost, setCost] = useState(55);
  const [risk, setRisk] = useState(36);
  const scenario = SIMULATION_SCENARIOS.find((item) => item.id === scenarioId)!;
  const candidates = patents.filter((patent) => patent.ecoDomain === scenario.domain);
  const score = Math.round(maturity * .35 + fit * .35 + (100 - cost) * .15 + (100 - risk) * .15);

  return <section className="module-page lab-page">
    <div className="module-intro"><div><p className="section-kicker">TEACHING SIMULATION</p><h2>专利技术情景推演实验室</h2><p>把专利方案放进生态治理场景，通过统一指标比较技术适配性。这里是教学推演，不替代工程试验、环境影响评价或专利价值结论。</p></div><div className="module-badge"><FlaskConical size={22} /><strong>{score}</strong><span>综合推演分</span></div></div>
    <div className="scenario-tabs">{SIMULATION_SCENARIOS.map((item) => <button className={scenarioId === item.id ? "active" : ""} key={item.id} onClick={() => setScenarioId(item.id)}>{item.title}</button>)}</div>
    <div className="lab-grid">
      <div className="scenario-card"><small>当前情景</small><h3>{scenario.title}</h3><p>{scenario.question}</p><div className="metric-chips">{scenario.metrics.map((metric) => <span key={metric}>{metric}</span>)}</div><div className="candidate-list"><strong>候选专利</strong>{(candidates.length ? candidates : patents.slice(0, 4)).slice(0, 5).map((patent) => <button className={selected?.id === patent.id ? "active" : ""} key={patent.id} onClick={() => onSelectPatent(patent.id)}><span>{patent.publicationNumber}</span><p>{patent.title}</p><ChevronRight size={15} /></button>)}</div></div>
      <div className="parameter-card"><div className="card-heading"><BarChart3 size={18} /><div><strong>参数面板</strong><span>拖动滑块查看结果变化</span></div></div>{[
        ["技术成熟度", maturity, setMaturity, "实验与应用证据充分程度"], ["场景适配度", fit, setFit, "对当前生态对象和空间尺度的适用性"], ["实施成本", cost, setCost, "建设、运维与扩展的相对负担"], ["不确定性风险", risk, setRisk, "数据、环境副作用与技术失效风险"],
      ].map(([label, value, setter, hint], index) => <div className="range-field" key={String(label)}><div><label htmlFor={`simulation-range-${index}`}><span>{String(label)}<small>{String(hint)}</small></span></label><strong>{String(value)}</strong></div><input id={`simulation-range-${index}`} type="range" min="0" max="100" value={Number(value)} onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))} /></div>)}</div>
      <div className="simulation-result"><span className="result-label">推演结果</span><div className="score-gauge" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><div><strong>{score}</strong><span>/ 100</span></div></div><h3>{score >= 75 ? "建议进入小尺度验证" : score >= 60 ? "需要补充证据后验证" : "暂不建议直接应用"}</h3><p>{selected ? `基于“${selected.title}”的元数据与人工设定参数。` : "请选择一项专利作为推演对象。"}</p><div className="result-bars"><span><i style={{ width: `${maturity}%` }} />成熟度</span><span><i style={{ width: `${fit}%` }} />适配度</span><span><i style={{ width: `${100 - risk}%` }} />风险可控</span></div><div className="lab-warning"><ShieldCheck size={16} />结果仅用于课程比较；参数不是从专利权利要求自动提取的工程性能。</div></div>
    </div>
  </section>;
}

function VentureStudio({ selected }: { selected: PatentRecord | null }) {
  const [problem, setProblem] = useState("");
  const [user, setUser] = useState("");
  const [solution, setSolution] = useState("");
  const [evidence, setEvidence] = useState("");
  const fields = [problem, user, solution, evidence];
  const readiness = Math.min(100, fields.filter((item) => item.trim().length >= 8).length * 20 + (selected ? 20 : 0));
  return <section className="module-page venture-page">
    <div className="module-intro"><div><p className="section-kicker">FROM LANDSCAPE TO VENTURE</p><h2>生态技术创新创业项目孵化</h2><p>将专利导航发现转化为问题定义、技术组合、验证计划和知识产权策略，形成课程成果包。</p></div><div className="module-badge"><Rocket size={22} /><strong>{readiness}%</strong><span>画布完整度</span></div></div>
    <div className="venture-grid">
      <div className="venture-canvas"><label><span>1 · 真实生态问题</span><textarea value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="对象、地点、尺度、风险和现有痛点是什么？" /></label><label><span>2 · 目标用户与使用者</span><textarea value={user} onChange={(event) => setUser(event.target.value)} placeholder="谁负责采购、使用、监管或受益？" /></label><label><span>3 · 技术方案与差异化</span><textarea value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="组合哪些技术，为什么优于现有方案？" /></label><label><span>4 · 最小验证证据</span><textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="需要哪些实验、试点、数据和评价指标？" /></label></div>
      <aside className="venture-side"><div className="selected-tech"><small>导航选定技术</small>{selected ? <><span>{domainById(selected.ecoDomain).name}</span><h3>{selected.title}</h3><p>{selected.publicationNumber} · {selected.applicant}</p></> : <><Lightbulb size={26} /><p>先在专利地图中选择一项技术。</p></>}</div><div className="readiness-list"><strong>成果包检查</strong>{[
        ["问题与场景边界", problem.length >= 8], ["用户与价值主张", user.length >= 8], ["专利及替代技术", Boolean(selected)], ["技术方案说明", solution.length >= 8], ["验证与风险计划", evidence.length >= 8],
      ].map(([label, done]) => <span key={String(label)} className={done ? "done" : ""}>{done ? <Check size={14} /> : <span className="empty-check" />}{String(label)}</span>)}</div><div className="next-step"><Sparkles size={17} /><div><strong>下一步建议</strong><p>{readiness < 40 ? "先完成问题和目标用户定义。" : readiness < 80 ? "补充技术证据和最小验证计划。" : "可以整理路演摘要和知识产权布局。"}</p></div></div></aside>
    </div>
  </section>;
}

function PatentEditor({ record, onClose, onSaved }: { record: PatentRecord | null; onClose: () => void; onSaved: (record: PatentRecord) => void }) {
  const [form, setForm] = useState<PatentInput>(record ? { ...record } : { ...emptyPatent });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function change<K extends keyof PatentInput>(key: K, value: PatentInput[K]) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(record ? `/api/patents/${record.id}` : "/api/patents", { method: record ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json() as { patent?: PatentRecord; error?: string };
      if (!response.ok || !result.patent) throw new Error(result.error || "保存失败");
      onSaved(result.patent);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "保存失败"); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="patent-editor" onSubmit={(event) => void submit(event)}><div className="editor-head"><div><small>{record ? "编辑记录" : "新增记录"}</small><h2>{record ? record.publicationNumber : "录入生态安全专利"}</h2></div><button type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button></div>{error && <p className="form-error">{error}</p>}<div className="editor-grid"><label><span>专利号 *</span><input required value={form.publicationNumber} onChange={(event) => change("publicationNumber", event.target.value)} /></label><label><span>生态技术领域</span><select value={form.ecoDomain} onChange={(event) => change("ecoDomain", event.target.value as EcoDomainId)}>{ECO_DOMAINS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="wide"><span>专利名称 *</span><input required value={form.title} onChange={(event) => change("title", event.target.value)} /></label><label className="wide"><span>申请人 *</span><input required value={form.applicant} onChange={(event) => change("applicant", event.target.value)} /></label><label className="wide"><span>申请人地址（用于地级市解析）</span><input value={form.applicantAddress} onChange={(event) => change("applicantAddress", event.target.value)} placeholder="建议保留省、市、区县和详细地址" /></label><label><span>公开日期</span><input type="date" value={form.publicationDate} onChange={(event) => change("publicationDate", event.target.value)} /></label><label><span>法律状态</span><input value={form.legalStatus} onChange={(event) => change("legalStatus", event.target.value)} /></label><label><span>地级市（人工校正）</span><input value={form.city} onChange={(event) => change("city", event.target.value)} /></label><label><span>省级地区</span><input value={form.province} onChange={(event) => change("province", event.target.value)} /></label><label><span>纬度</span><input type="number" step="any" value={form.latitude ?? ""} onChange={(event) => change("latitude", event.target.value === "" ? null : Number(event.target.value))} /></label><label><span>经度</span><input type="number" step="any" value={form.longitude ?? ""} onChange={(event) => change("longitude", event.target.value === "" ? null : Number(event.target.value))} /></label><label><span>数据来源</span><input value={form.sourceName} onChange={(event) => change("sourceName", event.target.value)} /></label><label><span>来源链接</span><input type="url" value={form.sourceUrl} onChange={(event) => change("sourceUrl", event.target.value)} /></label><label className="wide"><span>摘要</span><textarea value={form.abstract} onChange={(event) => change("abstract", event.target.value)} /></label></div><div className="editor-note"><MapPin size={16} />填写申请人地址后，系统会优先自动解析地级市；如同时填写城市和经纬度，则按人工校正保存。</div><div className="editor-actions"><button type="button" className="button button--soft" onClick={onClose}>取消</button><button className="button button--dark" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}保存记录</button></div></form></div>;
}
