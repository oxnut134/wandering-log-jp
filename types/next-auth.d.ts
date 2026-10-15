import type { DefaultSession } from "next-auth";

// auth.ts の jwt / session コールバックで付ける独自の項目
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            isDemo: boolean;
        } & DefaultSession["user"];
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id?: string;
        isDemo?: boolean;
    }
}
