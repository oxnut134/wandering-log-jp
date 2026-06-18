import { streamText, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { db } from "../../../lib/db";
import { visitedLocations } from "../../../lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

const anthropicProvider = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const currentUserId = parseInt(session.user.id, 10);

    const { messages } = await request.json();

    const locations = await db.select({
      name: visitedLocations.name,
      comment: visitedLocations.comment,
      latitude: visitedLocations.latitude,
      longitude: visitedLocations.longitude,
    })
      .from(visitedLocations)
      .where(eq(visitedLocations.user_id, currentUserId));

    const locationsText = locations.length > 0
      ? locations.map((l) =>
          `- ${l.name ?? "名称未設定"}（緯度: ${l.latitude}, 経度: ${l.longitude}）メモ: ${l.comment ?? "なし"}`
        ).join("\n")
      : "（訪問記録はまだありません）";

    const systemPrompt = `あなたは「Wandering Log」というアプリのAIアシスタントです。ユーザーが訪れた場所の記録(visited_locations)を参考にしながら、ユーザーの質問に日本語で回答してください。\n\n回答はチャットアプリのメッセージとして表示されます。Markdown記法(**、##、-など)は使わず、プレーンテキストで読みやすく回答してください。\n\n# ユーザーの訪問記録\n${locationsText}`;

    const modelMessages = await convertToModelMessages(messages.slice(-5));

    const result = streamText({
      model: anthropicProvider("claude-haiku-4-5-20251001"),
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 1024,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "回答の生成に失敗しました" }, { status: 500 });
  }
}
