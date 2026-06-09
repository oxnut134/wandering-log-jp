import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const { name, lat, lng } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
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
