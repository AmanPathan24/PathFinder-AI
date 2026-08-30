import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNodeStatuses, setNodeStatus, logOutcomeEvent } from '@/lib/db/storage';
import { NodeStatusType } from '@/types/roadmap';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';
    const roadmapId = params.id;

    const statuses = await getNodeStatuses(userId, roadmapId);
    return NextResponse.json({ success: true, nodeStatuses: statuses });
  } catch (error: any) {
    console.error('Error fetching node statuses:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch node statuses.' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';
    const roadmapId = params.id;

    const body = await req.json();
    const { nodeId, status } = body as { nodeId: string; status: NodeStatusType };

    if (!nodeId || !status) {
      return NextResponse.json(
        { error: 'nodeId and status are required.' },
        { status: 400 }
      );
    }

    const validStatuses: NodeStatusType[] = [
      'not-started',
      'learning',
      'done',
      'skipped',
      'known-prior',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await setNodeStatus(userId, roadmapId, nodeId, status);

    // If status is skipped or done, log outcome event for Phase 5 engine analysis
    if (status === 'skipped' || status === 'done') {
      await logOutcomeEvent({
        user_id: userId,
        roadmap_id: roadmapId,
        node_id: nodeId,
        action: status === 'skipped' ? 'skipped' : 'completed',
      });
    }

    return NextResponse.json({ success: true, nodeStatus: updated });
  } catch (error: any) {
    console.error('Error setting node status:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update node status.' },
      { status: 500 }
    );
  }
}
