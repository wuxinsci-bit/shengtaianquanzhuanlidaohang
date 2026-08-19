import { SiteHeader } from "@/app/components/SiteHeader";
import { PatentWorkspace } from "./PatentWorkspace";

export const metadata = { title: "专利导航与虚拟仿真", description: "专利采集、地级市解析、图形属性双向查询、教学仿真与项目孵化工作台。" };

export default async function PlatformPage({ searchParams }: { searchParams: Promise<{ tab?: string; domain?: string }> }) {
  const params = await searchParams;
  return <main className="workspace-page"><SiteHeader /><PatentWorkspace initialTab={params.tab} initialDomain={params.domain} /></main>;
}
