import { ArrowRight, BookOpen, Database, FlaskConical, Lightbulb, Map, Play, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { COURSE_MODULES, ECO_DOMAINS, SCIENCE_RESOURCES } from "@/app/lib/patents";

export const metadata = {
  title: "平台首页",
  description: "生态安全全领域专利导航、课程体系、虚拟仿真与创新创业实践入口。",
};

export default function PortalHome() {
  return (
    <main>
      <section className="portal-hero">
        <SiteHeader inverse />
        <div className="portal-hero-grid">
          <div className="portal-copy">
            <p className="section-kicker">全领域 · 全流程 · 可追溯</p>
            <h1>从生态问题出发<br />找到技术、坐标与机会</h1>
            <p>覆盖监测、森林、湿地、海洋、生物安全、污染防治、生态修复和气候风险。把公开专利数据转化为课程案例、空间情报和创新创业项目。</p>
            <div className="hero-actions">
              <a className="button button--lime" href="/platform"><Map size={18} />打开专利地图</a>
              <a className="button button--ghost" href="/course"><BookOpen size={18} />查看课程体系</a>
            </div>
          </div>
          <div className="hero-orbit" aria-label="平台能力概览">
            <div className="orbit-core"><span>生态安全</span><strong>13</strong><small>技术领域</small></div>
            <div className="orbit-card orbit-card--one"><Database size={17} /><span>公开数据采集</span></div>
            <div className="orbit-card orbit-card--two"><Map size={17} /><span>地级市解析</span></div>
            <div className="orbit-card orbit-card--three"><FlaskConical size={17} /><span>情景仿真</span></div>
            <div className="orbit-card orbit-card--four"><Lightbulb size={17} /><span>项目孵化</span></div>
          </div>
        </div>
        <div className="hero-strip">
          <span><strong>337</strong> 地级行政单元词典</span>
          <span><strong>5</strong> 课程模块</span>
          <span><strong>双向</strong> 图形—属性查询</span>
          <span><strong>可追溯</strong> 数据来源与质量</span>
        </div>
      </section>

      <section className="section-shell domain-section">
        <div className="section-heading">
          <div><p className="section-kicker">PATENT LANDSCAPE</p><h2>生态安全，不止森林火灾</h2></div>
          <p>按照“生态系统—环境介质—风险过程—治理技术”组织专利，不把宽泛的生态安全压缩成单一灾种。</p>
        </div>
        <div className="domain-grid">
          {ECO_DOMAINS.map((domain) => (
            <a key={domain.id} className="domain-card" href={`/platform?domain=${domain.id}`} style={{ "--domain-color": domain.color } as React.CSSProperties}>
              <span className="domain-code">{domain.code}</span>
              <h3>{domain.name}</h3>
              <p>{domain.description}</p>
              <span className="domain-link">进入专题 <ArrowRight size={15} /></span>
            </a>
          ))}
        </div>
      </section>

      <section className="workflow-section">
        <div className="section-shell">
          <div className="section-heading section-heading--light">
            <div><p className="section-kicker">LEARNING BY DOING</p><h2>一条贯通课程与创新创业的实践链</h2></div>
            <a className="inline-link" href="/course">完整课程设计 <ArrowRight size={16} /></a>
          </div>
          <div className="workflow-grid">
            {[
              ["01", "界定问题", "从生态安全挑战形成技术主题与检索边界。"],
              ["02", "采集清洗", "从公开来源获得专利并完成去重、地址与城市解析。"],
              ["03", "导航分析", "地图、趋势、申请人和技术主题联动发现空白点。"],
              ["04", "仿真推演", "把专利方案放入教学情景，比较适配性与风险。"],
              ["05", "项目孵化", "沉淀专利组合、商业画布、路演与成果评价。"],
            ].map(([number, title, text]) => <div className="workflow-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section-shell course-preview">
        <div className="section-heading">
          <div><p className="section-kicker">CURRICULUM</p><h2>课程体系构建与人才培养</h2></div>
          <p>课程结构依据超星课程《生态安全领域专利导航与创新创业实践》，平台为每章配置对应的在线实训任务。</p>
        </div>
        <div className="course-module-list">
          {COURSE_MODULES.map((module) => (
            <div className="course-row" key={module.number}>
              <span className="course-number">{module.number}</span>
              <div><h3>{module.title}</h3><p>{module.outcome}</p></div>
              <span>{module.lessons.length} 个学习单元</span>
            </div>
          ))}
        </div>
        <div className="course-actions">
          <a className="button button--dark" href="/course">查看课程—平台映射</a>
          <a className="button button--soft" href="https://mooc1.chaoxing.com/mooc-ans/course/portal/pZVsIQjqc-6iY5NMp68a0g==" target="_blank" rel="noreferrer">进入超星课程 <ArrowRight size={16} /></a>
        </div>
      </section>

      <section className="science-section">
        <div className="section-shell">
          <div className="section-heading">
            <div><p className="section-kicker">SCIENCE FOR ALL</p><h2>首页科普资料</h2></div>
            <p>选择政府部门和国际组织的公开内容，帮助学生先理解生态问题，再进入专利检索。</p>
          </div>
          <div className="science-grid">
            {SCIENCE_RESOURCES.map((resource, index) => (
              <a className={`science-card science-card--${index + 1}`} href={resource.url} target="_blank" rel="noreferrer" key={resource.title}>
                <span>{resource.tag}</span><h3>{resource.title}</h3><p>{resource.description}</p><small>{resource.source} · 查看原文 ↗</small>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="platform-cta">
        <div className="cta-copy">
          <span className="round-icon"><Play size={22} fill="currentColor" /></span>
          <div><p className="section-kicker">VIRTUAL LAB</p><h2>进入生态安全专利导航虚拟仿真平台</h2><p>检索专利、点击城市、运行教学推演，并把技术机会转化为创新创业项目。</p></div>
        </div>
        <a className="button button--lime" href="/platform">进入虚拟仿真平台 <ArrowRight size={18} /></a>
      </section>

      <section className="trust-strip">
        <ShieldCheck size={22} /><p><strong>数据边界说明：</strong>专利“所在地”优先指申请人地址解析到的地级市；仅凭机构名称推断的位置会标注较低置信度，不作为法律状态或权属结论。</p>
      </section>
      <SiteFooter />
    </main>
  );
}
