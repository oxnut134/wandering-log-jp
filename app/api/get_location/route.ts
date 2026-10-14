import { NextResponse } from 'next/server';
import { db } from "../../../lib/db";
import { visitedLocations, } from "../../../lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(request: Request) {

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const currentUserId = parseInt(session.user.id, 10);


  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }


  try {
    const location = await db
      .select({
        id: visitedLocations.id,
        name: visitedLocations.name,
        comment: visitedLocations.comment,
      })
      .from(visitedLocations)
      .where(
        and(
          eq(visitedLocations.id, Number(id)),
          eq(visitedLocations.user_id, Number(currentUserId)),
        )
      )
    return NextResponse.json(location);

  } catch (error) {
    console.error('❌ Database Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
