import { ArrowRight, CheckCircle2, ExternalLink, FlaskConical, Map, Rocket, Search, Sparkles } from "lucide-react";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { COURSE_MODULES } from "@/app/lib/patents";
import { requireAppUser } from "@/app/lib/app-auth";

export const metadata = { title: "课程体系", description: "生态安全专利导航课程体系与创新创业人才培养方案。" };
export const dynamic = "force-dynamic";

const practice = [
  [Search, "检索设计", "建立技术主题词、IPC/CPC 分类与排除词，形成可复现检索式。"],
  [Map, "空间导航", "完成申请人地址清洗、地级市解析和图形—属性双向查询。"],
  [FlaskConical, "情景推演", "以教学模型比较专利技术的成熟度、适配度、成本与风险。"],
  [Rocket, "创新孵化", "把技术空白转化为项目命题，完成知识产权布局和路演证据包。"],
];

export default async function CoursePage() {
  await requireAppUser("/course");
  return (
    <main className="inner-page">
      <SiteHeader />
      <section className="inner-hero course-hero">
        <p className="section-kicker">COURSE × PLATFORM × ENTREPRENEURSHIP</p>
        <h1>生态安全领域专利导航<br />课程体系与人才培养</h1>
        <p>以超星课程五大模块为知识主线，以平台实训为能力主线，以真实问题和项目孵化为成果主线。</p>
        <div className="hero-actions">
          <a className="button button--dark" href="https://mooc1.chaoxing.com/mooc-ans/course/portal/pZVsIQjqc-6iY5NMp68a0g==" target="_blank" rel="noreferrer">打开超星课程 <ExternalLink size={17} /></a>
          <a className="button button--soft" href="/platform">开始平台实训 <ArrowRight size={17} /></a>
        </div>
      </section>

      <section className="section-shell course-architecture">
        <div className="section-heading"><div><p className="section-kicker">FIVE MODULES</p><h2>五阶课程结构</h2></div><p>从基础认知进入方法训练，再到创业整合、项目孵化和综合评价。</p></div>
        <div className="course-accordion">
          {COURSE_MODULES.map((module, index) => (
            <details key={module.number} open={index === 0}>
              <summary><span>{module.number}</span><div><h3>{module.title}</h3><p>{module.outcome}</p></div><strong>{module.lessons.length} 单元</strong></summary>
              <div className="lesson-grid">
                {module.lessons.map((lesson, lessonIndex) => <div key={lesson}><span>{module.number}.{lessonIndex + 1}</span><p>{lesson}</p></div>)}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="practice-band">
        <div className="section-shell">
          <div className="section-heading section-heading--light"><div><p className="section-kicker">PRACTICE LOOP</p><h2>每一章都落到平台任务</h2></div><p>课程不是独立的知识展板，而是贯穿一次完整专利导航项目。</p></div>
          <div className="practice-grid">
            {practice.map(([Icon, title, description], index) => {
              const PracticeIcon = Icon as typeof Search;
              return <div key={String(title)}><span className="practice-icon"><PracticeIcon size={21} /></span><small>任务 {index + 1}</small><h3>{String(title)}</h3><p>{String(description)}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="section-shell talent-section">
        <div className="talent-intro"><p className="section-kicker">T-SHAPED TALENT</p><h2>创新创业人才培养模块</h2><p>目标不是只会检索专利，而是培养能理解生态问题、读懂技术证据、完成空间分析并组织创新项目的复合型人才。</p></div>
        <div className="talent-matrix">
          {[
            ["生态问题理解", "识别对象、压力、风险与尺度，避免把生态安全等同于单一环境问题。"],
            ["专利情报能力", "检索、去重、同族、法律状态、申请人和技术路线分析。"],
            ["数据与空间能力", "公开数据获取、地址解析、地图联动和质量审计。"],
            ["创新设计能力", "从技术空白提出方案，形成专利组合与研发路线。"],
            ["创业实践能力", "用户问题、价值主张、验证计划、合规与路演表达。"],
            ["责任与合规", "尊重网站规则、数据许可、隐私边界和专利法律结论边界。"],
          ].map(([title, text]) => <div key={title}><CheckCircle2 size={18} /><h3>{title}</h3><p>{text}</p></div>)}
        </div>
      </section>

      <section className="assessment-section">
        <div className="section-shell assessment-grid">
          <div><p className="section-kicker">ASSESSMENT</p><h2>成果导向评价</h2><p>建议以过程证据和综合作品共同评价，避免只考记忆性概念。</p></div>
          <div className="score-ring"><strong>100</strong><span>总分</span></div>
          <div className="score-list">
            <span><i style={{ width: "25%" }} />检索与数据质量 25%</span>
            <span><i style={{ width: "25%" }} />导航分析与表达 25%</span>
            <span><i style={{ width: "20%" }} />仿真推演与反思 20%</span>
            <span><i style={{ width: "30%" }} />创新项目与路演 30%</span>
          </div>
        </div>
      </section>

      <section className="course-bottom-cta"><Sparkles size={24} /><div><h2>把第一个课程主题带入工作台</h2><p>从“生态修复”“水生态监测”或“森林火灾监测”开始，完成一次采集与地图分析。</p></div><a className="button button--lime" href="/platform?tab=collect">开始实训 <ArrowRight size={17} /></a></section>
      <SiteFooter />
    </main>
  );
}
