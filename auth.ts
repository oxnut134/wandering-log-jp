// 💡 auth.ts (プロジェクトのルート直下に新設) [INDEX]
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "./lib/db";              // 🎯 お使いのパスに微調整してください
import { users } from './lib/schema';         // 🎯 お使いのパスに微調整してください
import { eq } from 'drizzle-orm';
import bcrypt from "bcryptjs";
import { isDemoEnabled, isDemoUserEmail } from "./lib/demo";

// JWT の署名鍵。固定値にフォールバックするとトークンを偽造できるため、未設定なら起動させない
const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
    throw new Error("AUTH_SECRET が設定されていません。.env.local（本番は Vercel の環境変数）に設定してください。");
}

// 🎯 核心：ここで初期化を1回だけ行い、強力な「4つの武器」をエクスポートする！ [INDEX]
export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                // デモが無効のときは、デモユーザーはパスワードでもログインさせない（ログイン失敗としてエラーを表示する）
                if (isDemoUserEmail(credentials.email as string) && !isDemoEnabled()) return null;
                try {
                    const email = credentials.email as string;
                    const password = credentials.password as string;

                    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
                    const user = result[0];

                    if (!user || !user.password) return null;

                    const isPasswordCorrect = await bcrypt.compare(password, user.password);
                    if (!isPasswordCorrect) return null;

                    return { id: user.id.toString(), name: user.name, email: user.email };
                } catch (error) {
                    return null;
                }
            }
        }),
        // デモ用：入力は受け取らず、サーバー側で DEMO_USER_EMAIL のユーザーを返す（パスワードはクライアントに出さない）
        CredentialsProvider({
            id: "demo",
            name: "Demo",
            credentials: {},
            async authorize() {
                if (!isDemoEnabled()) return null;
                try {
                    const email = process.env.DEMO_USER_EMAIL as string;

                    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
                    const user = result[0];
                    if (!user) return null;

                    return { id: user.id.toString(), name: user.name, email: user.email };
                } catch (error) {
                    console.error("[auth] demo authorize error:", error);
                    return null;
                }
            }
        })
    ],
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    secret: authSecret,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id; // 🔑 1. ログインの瞬間に、IDを暗号トークンに刻印する
                // パスワードでログインした場合もデモユーザーとして扱う（AI の上限をすり抜けないように）
                token.isDemo = isDemoUserEmail(user.email);
            }
            // デモが無効なら、デモユーザーのセッションは発行・継続しない（null を返すと Auth.js がセッション Cookie を消す）
            if (token.isDemo && !isDemoEnabled()) return null;
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string; // 🔑 2. API側で読み取れるようにセッションにIDを流し込む
                session.user.isDemo = token.isDemo === true;
            }
            return session;
        }
    }
});
