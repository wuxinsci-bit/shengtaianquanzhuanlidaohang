"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, UserPlus } from "lucide-react";

type Mode = "login" | "register";

export function AuthScreen({ mode }: { mode: Mode }) {
  const [form, setForm] = useState({ username: "", password: "", displayName: "", institution: "", email: "", role: "学习者" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isRegister = mode === "register";

  function change(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(form),
      });
      const result = await response.json() as { error?: string; audit?: string };
      if (!response.ok) throw new Error(result.error || (isRegister ? "注册失败" : "登录失败"));
      if (isRegister) setMessage(`${result.audit || "自动审核通过"}，正在进入平台…`);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "操作失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-video" aria-hidden="true">
        <iframe src="https://www.youtube-nocookie.com/embed/XhjN8Xux2I4?autoplay=1&mute=1&controls=0&loop=1&playlist=XhjN8Xux2I4&modestbranding=1&playsinline=1" title="生态系统修复背景视频" tabIndex={-1} allow="autoplay; encrypted-media; picture-in-picture" />
      </div>
      <div className="auth-shade" />
      <a className="auth-brand" href="/"><span className="brand-mark">E</span><span><strong>生态智图</strong><small>ECO PATENT NAVIGATOR</small></span></a>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card-head"><p className="section-kicker">ECOLOGICAL SECURITY · 2025FR002</p><h1 id="auth-title">{isRegister ? "注册实践账号" : "登录生态智图"}</h1><p>{isRegister ? "填写基本资料，系统会即时完成格式与内容审核。" : "进入生态安全专利导航、课程体系与虚拟仿真实训。"}</p></div>
        <form onSubmit={submit} className="auth-form">
          <label><span>账号</span><input required autoComplete="username" value={form.username} onChange={(event) => change("username", event.target.value)} placeholder="请输入账号" /></label>
          <label><span>密码</span><input required type="password" minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} value={form.password} onChange={(event) => change("password", event.target.value)} placeholder="至少8位" /></label>
          {isRegister && <>
            <div className="auth-two-fields"><label><span>姓名 / 团队</span><input required value={form.displayName} onChange={(event) => change("displayName", event.target.value)} placeholder="用于平台显示" /></label><label><span>身份</span><select value={form.role} onChange={(event) => change("role", event.target.value)}><option>学习者</option><option>教师</option><option>创新创业团队</option><option>科研人员</option></select></label></div>
            <label><span>所属单位</span><input required value={form.institution} onChange={(event) => change("institution", event.target.value)} placeholder="学校、企业或科研机构" /></label>
            <label><span>联系邮箱（可选）</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => change("email", event.target.value)} placeholder="用于后续通知" /></label>
          </>}
          {error && <div className="auth-message auth-message--error">{error}</div>}
          {message && <div className="auth-message auth-message--success"><CheckCircle2 size={17} />{message}</div>}
          <button className="button button--lime button--full auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : isRegister ? <UserPlus size={17} /> : <LockKeyhole size={17} />}{busy ? "处理中…" : isRegister ? "提交注册并自动审核" : "登录平台"}<ArrowRight size={16} /></button>
        </form>
        <div className="auth-note">{isRegister ? "审核规则：账号、密码、姓名和所属单位格式合规后自动通过；异常内容会即时提示。" : "项目初始账号可使用项目编号登录，正式使用后建议在后台更换密码。"}</div>
        <div className="auth-links">{isRegister ? <span>已有账号？<a href="/login">返回登录</a></span> : <span>还没有账号？<a href="/register">立即注册</a></span>}<a href="/">返回视频首页</a></div>
      </section>
      <footer className="auth-footer">© 2025 中南林业科技大学 · 长沙遥测信息科技有限公司<br />生态安全领域专利导航课程体系构建与创新创业人才培养</footer>
    </main>
  );
}
