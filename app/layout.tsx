import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { EcoAssistant } from "./components/EcoAssistant";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;
  const description = "生态安全全领域专利导航、课程实践、创新创业与虚拟仿真平台。";
  return {
    title: { default: "生态智图 · 生态安全专利导航", template: "%s | 生态智图" },
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "生态智图 · 生态安全专利导航", description, images: [{ url: imageUrl, width: 1792, height: 1024, alt: "生态智图生态安全创新网络" }] },
    twitter: { card: "summary_large_image", title: "生态智图 · 生态安全专利导航", description, images: [imageUrl] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}<EcoAssistant /></body>
    </html>
  );
}
