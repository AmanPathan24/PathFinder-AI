import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRoadmapsForUser, createRoadmap } from '@/lib/db/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';

    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    const roadmaps = await getRoadmapsForUser(userId);
    const filtered = includeArchived ? roadmaps : roadmaps.filter((r) => !r.is_archived);

    return NextResponse.json({ success: true, roadmaps: filtered });
  } catch (error: any) {
    console.error('Error fetching roadmaps:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch roadmaps.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';

    const body = await req.json();
    const { title, target_track, time_budget_weeks, weekly_hours = 10, raw_goal } = body;

    if (!target_track || !title) {
      return NextResponse.json(
        { error: 'Title and target track are required.' },
        { status: 400 }
      );
    }

    const newRoadmap = await createRoadmap({
      user_id: userId,
      title,
      target_track,
      time_budget_weeks: time_budget_weeks || 24,
      weekly_hours,
      raw_goal: raw_goal || `Roadmap for ${title}`,
      is_archived: false,
    });

    return NextResponse.json({ success: true, roadmap: newRoadmap });
  } catch (error: any) {
    console.error('Error creating roadmap:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create roadmap.' },
      { status: 500 }
    );
  }
}
