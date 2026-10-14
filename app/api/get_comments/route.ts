import { NextResponse } from 'next/server';
import { db } from "../../../lib/db";
import { visitedLocations, visitedPlaces, visitedComments, } from "../../../lib/schema";
import { and, eq, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(request: Request) {

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const currentUserId = parseInt(session.user.id, 10);

  const { searchParams } = new URL(request.url);
  const logId = searchParams.get('log_id');

  if (!logId) {
    return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }


  try {
    const comments = await db
      .select({
        id: visitedComments.id,
        comment: visitedComments.comment,
      })
      .from(visitedComments)
      .where(and(
        eq(visitedComments.log_id, Number(logId)),
        eq(visitedComments.user_id, currentUserId)
      ))

    return NextResponse.json(comments);

  } catch (error) {
    console.error('❌ Database Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
