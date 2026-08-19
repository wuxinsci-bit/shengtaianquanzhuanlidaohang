import { AuthScreen } from "../components/AuthScreen";

export const metadata = { title: "注册", description: "注册生态智图生态安全专利导航平台，系统自动审核。" };

export default function RegisterPage() {
  return <AuthScreen mode="register" />;
}
