import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { upvoteResource } from '@/lib/db/storage';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || 'usr_demo_1';
    const resourceId = params.id;

    const updated = await upvoteResource(resourceId, userId);
    if (!updated) {
      return NextResponse.json({ error: 'Resource not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, resource: updated });
  } catch (error: any) {
    console.error('Error upvoting resource:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upvote resource.' },
      { status: 500 }
    );
  }
}
