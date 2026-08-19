import { AuthScreen } from "../components/AuthScreen";

export const metadata = { title: "登录", description: "登录生态智图生态安全专利导航平台。" };

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
