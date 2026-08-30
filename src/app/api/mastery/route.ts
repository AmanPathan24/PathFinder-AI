import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSkillMastery, setSkillMastery } from '@/lib/db/storage';
import { SkillMasterySource } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';

    const masteries = await getSkillMastery(userId);
    return NextResponse.json({ success: true, masteries });
  } catch (error: any) {
    console.error('Error fetching skill mastery:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch skill mastery.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';

    const body = await req.json();
    const { nodeId, source } = body as { nodeId: string; source: SkillMasterySource };

    if (!nodeId || !source) {
      return NextResponse.json(
        { error: 'nodeId and source are required.' },
        { status: 400 }
      );
    }

    const updated = await setSkillMastery(userId, nodeId, source);
    return NextResponse.json({ success: true, mastery: updated });
  } catch (error: any) {
    console.error('Error setting skill mastery:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update skill mastery.' },
      { status: 500 }
    );
  }
}
