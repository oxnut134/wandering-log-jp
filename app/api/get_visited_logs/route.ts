import { NextResponse } from 'next/server';
import { db } from "../../../lib/db";
import { visitedLocations, visitedPlaces, visitedLogs } from "../../../lib/schema";
import { and, eq, desc } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(request: Request) {

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const currentUserId = parseInt(session.user.id, 10);

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('location_id');

  if (!locationId) {
    return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }


  try {
    const logs = await db
      .select({
        id: visitedLogs.id,
        visited_at: visitedLogs.visited_at,
        place_id: visitedLogs.place_id,
      })
      .from(visitedLogs)
      .where(and(
        eq(visitedLogs.location_id, Number(locationId)),
        eq(visitedLogs.user_id, currentUserId)
      ))
      .orderBy(desc(visitedLogs.visited_at));

    const formattedLogs = logs.map(log => ({
      ...log,
      visited_at: log.visited_at instanceof Date
        ? log.visited_at.toISOString()
        : log.visited_at
          ? String(log.visited_at).replace(' ', 'T') + 'Z'
          : null
    }));
    return NextResponse.json(formattedLogs);

  } catch (error) {
    console.error('❌ Database Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
