import type { Session } from "next-auth";

// デモログインを使えるか。DEMO_LOGIN_ENABLED が "true" で、DEMO_USER_EMAIL が設定されているときだけ有効
// サーバー側でのみ読む（NEXT_PUBLIC_ を付けないので、値を変えても再ビルドは不要。再起動・再デプロイで反映）
export function isDemoEnabled(): boolean {
    return process.env.DEMO_LOGIN_ENABLED === "true" && !!process.env.DEMO_USER_EMAIL;
}

// DEMO_USER_EMAIL のユーザーか。ログイン経路（demo / credentials）に関係なくデモユーザーとして扱うため、email で判定する
export function isDemoUserEmail(email: string | null | undefined): boolean {
    const demoEmail = process.env.DEMO_USER_EMAIL;
    if (!demoEmail || !email) return false;
    return email.trim().toLowerCase() === demoEmail.trim().toLowerCase();
}

// デモユーザーのセッションか
export function isDemoSession(session: Session | null | undefined): boolean {
    return session?.user?.isDemo === true;
}
