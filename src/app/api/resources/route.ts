import { NextRequest, NextResponse } from 'next/server';
import { fetchResourcesForSkill } from '@/lib/resources/curated';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentSkillId = searchParams.get('parentSkillId');
    const topicTitle = searchParams.get('topicTitle') || undefined;

    if (!parentSkillId) {
      return NextResponse.json(
        { error: 'parentSkillId is required.' },
        { status: 400 }
      );
    }

    const resources = await fetchResourcesForSkill(parentSkillId, topicTitle);
    return NextResponse.json({ success: true, resources });
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch resources.' },
      { status: 500 }
    );
  }
}
