import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/auth';
import { isDemoSession } from '@/lib/demo';
import { AI_LIMIT_MESSAGE, consumeAiQuota } from '@/lib/aiLimit';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, lat, lng } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // デモユーザーは 1 日あたりの上限まで（通常のユーザーには上限なし）
    if (isDemoSession(session) && !(await consumeAiQuota(parseInt(session.user.id, 10)))) {
      return NextResponse.json({ error: AI_LIMIT_MESSAGE }, { status: 429 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `「${name}」という場所について、観光客向けに100文字程度の日本語で簡単な説明を生成してください。`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const description = textBlock?.type === 'text' ? textBlock.text : '';

    return NextResponse.json({ description });
  } catch (error) {
    console.error('Description generation error:', error);
    return NextResponse.json({ error: '説明の生成に失敗しました' }, { status: 500 });
  }
}
