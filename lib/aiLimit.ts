import { sql } from "drizzle-orm";
import { db } from "./db";
import { aiUsage } from "./schema";

const DEFAULT_DEMO_AI_DAILY_LIMIT = 50;

export const AI_LIMIT_MESSAGE = "デモの本日の利用上限に達しました";

// デモユーザーの 1 日あたりの AI 呼び出し上限。DEMO_AI_DAILY_LIMIT が未設定・数値でないときは 50
export function getDemoAiDailyLimit(): number {
    const limit = Number.parseInt(process.env.DEMO_AI_DAILY_LIMIT ?? "", 10);
    return Number.isNaN(limit) ? DEFAULT_DEMO_AI_DAILY_LIMIT : limit;
}

// AI の呼び出しを 1 回分使う。上限内なら回数を加算して true、上限に達していたら加算せず false
// 上限の確認と加算を 1 本の SQL で行うので、同時に呼ばれても上限を超えない。日付は日本時間で区切る
export async function consumeAiQuota(userId: number): Promise<boolean> {
    const limit = getDemoAiDailyLimit();
    if (limit <= 0) return false;

    const result = await db
        .insert(aiUsage)
        .values({
            user_id: userId,
            date: sql`(now() AT TIME ZONE 'Asia/Tokyo')::date`,
            count: 1,
        })
        .onConflictDoUpdate({
            target: [aiUsage.user_id, aiUsage.date],
            set: { count: sql`${aiUsage.count} + 1`, updated_at: sql`now()` },
            setWhere: sql`${aiUsage.count} < ${limit}`,
        })
        .returning({ count: aiUsage.count });

    return result.length > 0;
}
