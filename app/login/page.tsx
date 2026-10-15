import { connection } from "next/server";
import { isDemoEnabled } from "@/lib/demo";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
    // 動的レンダリングにして、DEMO_LOGIN_ENABLED をビルド時ではなくリクエスト時に読む
    await connection();

    return <LoginForm showDemo={isDemoEnabled()} />;
}
