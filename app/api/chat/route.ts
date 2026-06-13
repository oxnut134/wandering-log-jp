import { db } from "../../../lib/db";
import { visitedLocations } from "../../../lib/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const currentUserId = parseInt(session.user.id, 10);

    const { message, history } = await request.json();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

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

    const conversation = Array.isArray(history)
      ? history
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role, content: h.content }))
      : [];

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...conversation, { role: "user", content: message }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock?.type === "text" ? textBlock.text : "";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "回答の生成に失敗しました" }, { status: 500 });
  }
}
