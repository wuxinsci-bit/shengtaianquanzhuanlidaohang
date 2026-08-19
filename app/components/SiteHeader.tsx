"use client";

import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  ["/home", "平台首页"],
  ["/course", "课程体系"],
  ["/platform", "专利导航"],
  ["/platform?tab=lab", "虚拟仿真"],
  ["/platform?tab=venture", "项目孵化"],
];

export function SiteHeader({ inverse = false }: { inverse?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className={`site-header ${inverse ? "site-header--inverse" : ""}`}>
      <a className="site-brand" href="/home" aria-label="生态智图首页">
        <span className="brand-mark">E</span>
        <span><strong>生态智图</strong><small>专利导航与虚拟仿真</small></span>
      </a>
      <button className="mobile-menu-button" type="button" onClick={() => setOpen(!open)} aria-label={open ? "关闭导航" : "打开导航"} aria-expanded={open}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <nav className={`site-nav ${open ? "is-open" : ""}`} aria-label="主导航">
        {links.map(([href, label]) => (
          <a key={href} className={pathname === href.split("?")[0] ? "active" : ""} href={href} onClick={() => setOpen(false)}>{label}</a>
        ))}
      </nav>
      <a className="nav-cta" href="/platform">进入工作台 <span>↗</span></a>
    </header>
  );
}
