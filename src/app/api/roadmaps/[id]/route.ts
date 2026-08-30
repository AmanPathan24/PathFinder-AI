import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRoadmapById, updateRoadmap, getNodeStatuses } from '@/lib/db/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';
    const roadmapId = params.id;

    const roadmap = await getRoadmapById(roadmapId);
    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
    }

    const statuses = await getNodeStatuses(userId, roadmapId);

    return NextResponse.json({
      success: true,
      roadmap,
      nodeStatuses: statuses,
    });
  } catch (error: any) {
    console.error('Error fetching roadmap:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch roadmap.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';
    const roadmapId = params.id;

    const body = await req.json();
    const updated = await updateRoadmap(roadmapId, body);

    if (!updated) {
      return NextResponse.json({ error: 'Roadmap not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, roadmap: updated });
  } catch (error: any) {
    console.error('Error updating roadmap:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update roadmap.' },
      { status: 500 }
    );
  }
}
