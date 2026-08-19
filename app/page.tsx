export const metadata = {
  title: "生态安全专利导航 | 生态智图",
  description: "面向生态安全全领域的专利导航、课程实践与虚拟仿真平台。",
};

export default function WelcomePage() {
  return (
    <main className="welcome-shell">
      <div className="video-stage" aria-hidden="true">
        <iframe
          src="https://www.youtube-nocookie.com/embed/XhjN8Xux2I4?autoplay=1&mute=1&controls=0&loop=1&playlist=XhjN8Xux2I4&modestbranding=1&playsinline=1"
          title="生态系统修复背景视频"
          allow="autoplay; encrypted-media; picture-in-picture"
          tabIndex={-1}
        />
      </div>
      <div className="welcome-shade" />
      <nav className="welcome-nav" aria-label="首页导航">
        <a className="brand" href="/">
          <span className="brand-mark">E</span>
          <span>生态智图</span>
        </a>
        <span className="project-tag">2025FR002 · 教学与实践平台</span>
      </nav>
      <section className="welcome-content">
        <p className="eyebrow">ECOLOGICAL SECURITY · PATENT NAVIGATION</p>
        <h1>看见生态技术<br />在中国生长的坐标</h1>
        <p className="welcome-lead">
          汇聚生态安全全领域专利、城市空间分布、课程图谱与虚拟仿真实践，
          让一次检索成为一次技术洞察和创新创业训练。
        </p>
        <div className="welcome-actions">
          <a className="primary-action" href="/home">
            进入平台主页 <span aria-hidden="true">↗</span>
          </a>
          <a className="text-action" href="/platform">直接进入虚拟仿真平台</a>
        </div>
      </section>
      <div className="welcome-foot">
        <span>山水林田湖草沙 · 陆海统筹 · 数字创新</span>
        <a href="https://www.unep.org/news-and-stories/video/ecosystem-restoration" target="_blank" rel="noreferrer">
          影像来源：联合国环境规划署
        </a>
      </div>
    </main>
  );
}
